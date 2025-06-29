'use client';
import React, { useEffect } from 'react';
import { useGetChatMessagesQuery } from '@/store/features/message';

import { addDays } from 'date-fns/addDays';
import { addHours } from 'date-fns/addHours';
import { format } from 'date-fns/format';
import { nextSaturday } from 'date-fns/nextSaturday';
import {
	Archive,
	ArchiveX,
	ChevronLeft,
	Clock,
	Copy,
	Download,
	Forward,
	MoreVertical,
	Reply,
	ReplyAll,
	ThumbsDown,
	ThumbsUp,
	Trash2,
} from 'lucide-react';

import {
	DropdownMenuContent,
	DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
// import { Calendar } from '@/components/ui/calendar';
import {
	DropdownMenu,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { Mail } from '../data';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { connectSocket, getSocket } from '@/lib/socketClient';
import { Input } from '@/components/ui/input';
import { env } from '@/lib';
import { Socket } from 'socket.io-client';

interface MailDisplayProps {
	mail: Mail | null;
}

interface Message {
	role: 'agent' | 'user';
	content: string;
	timestamp: string;
}
export function MailDisplay({ mail }: MailDisplayProps) {
	const router = useRouter();
	const params = useParams();
	const today = new Date();
	const [input, setInput] = useState('');
	const { data: session } = useSession();
	const searchParams = useSearchParams();
	const messagesEndRef = React.useRef<HTMLDivElement>(null);
	const { data: initialMessages, isSuccess } = useGetChatMessagesQuery({
		chatType: searchParams.get('type') || 'personal',
		targetId: params.id.toString(),
	});

	// ✅ Local state to hold messages
	const [messages, setMessages] = useState([]);
	useEffect(() => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	}, [messages]);

	useEffect(() => {
		if (isSuccess && initialMessages) {
			setMessages(initialMessages); // initialize from API response
		}
	}, [isSuccess, initialMessages]);

	useEffect(() => {
		let socketRef: Socket | null = null;

		const setupSocket = async () => {
			try {
				const socket = await connectSocket();
				socketRef = socket;

				socket.emit('register', session.user.id);

				const handleReceiveMessage = (message: any) => {
					setMessages((prev) => [...prev, message]);
				};

				socket.on('receiveMessage', handleReceiveMessage);

				return () => {
					console.log('Cleaning up socket listeners');
					socket?.off('receiveMessage', handleReceiveMessage);
				};
			} catch (err) {
				console.error('Socket setup failed:', err);
			}
		};

		if (session?.user?.id) {
			setupSocket();
		}

		return () => {
			// Optional: disconnect on unmount (not needed if app-wide socket)
			socketRef?.disconnect();
		};
	}, []);

	if (!session || !session.user) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-muted-foreground">Please log in to view messages.</p>
			</div>
		);
	}
	const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!input.trim() || !session?.user?.id) return;

		let socket = getSocket();

		// ❗ If socket is not connected, try reconnecting
		if (!socket || !socket.connected) {
			console.warn('Socket not connected. Attempting to reconnect...');

			try {
				// Attempt to reconnect
				socket = await connectSocket();
			} catch (err) {
				console.error('❌ Could not reconnect socket:', err);
				return;
			}
		}

		if (!socket || !socket.connected) {
			console.error('❌ Socket still not connected after retry');
			return;
		}

		// Build message
		const newMessage = {
			sender: session.user.id,
			receiver: params.id.toString(),
			chatType: searchParams.get('type') || 'personal',
			text: input,
			type: 'text',
			visibility: session.user.role === 'admin' ? 'public' : 'private',
			createdAt: new Date().toISOString(),
		};

		// 1. Emit message to server
		socket.emit('sendMessage', newMessage);

		// 2. Optimistically update the UI
		const messageUpdate = {
			...newMessage,
			sender: {
				_id: session.user.id,
				name: 'You', // Optionally replace with session.user.name
			},
		};

		setMessages((prevMessages) => [...prevMessages, messageUpdate]);

		// 3. Reset input field
		e.target.reset();
		setInput('');
	};
	return (
		<div className="flex h-full flex-col">
			<TooltipProvider>
				<div className="hidden md:flex items-center p-2">
					<div className="flex items-center gap-2">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" disabled={!mail}>
									<Archive className="h-4 w-4" />
									<span className="sr-only">Archive</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Archive</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" disabled={!mail}>
									<ArchiveX className="h-4 w-4" />
									<span className="sr-only">Move to junk</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Move to junk</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" disabled={!mail}>
									<Trash2 className="h-4 w-4" />
									<span className="sr-only">Move to trash</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Move to trash</TooltipContent>
						</Tooltip>
						<Separator orientation="vertical" className="mx-1 h-6" />
						<Tooltip>
							<Popover>
								<PopoverTrigger asChild>
									<TooltipTrigger asChild>
										<Button variant="ghost" size="icon" disabled={!mail}>
											<Clock className="h-4 w-4" />
											<span className="sr-only">Snooze</span>
										</Button>
									</TooltipTrigger>
								</PopoverTrigger>
								<PopoverContent className="flex w-[535px] p-0">
									<div className="flex flex-col gap-2 border-r px-2 py-4">
										<div className="px-4 text-sm font-medium">Snooze until</div>
										<div className="grid min-w-[250px] gap-1">
											<Button
												variant="ghost"
												className="justify-start font-normal"
											>
												Later today{' '}
												<span className="ml-auto text-muted-foreground">
													{format(addHours(today, 4), 'E, h:m b')}
												</span>
											</Button>
											<Button
												variant="ghost"
												className="justify-start font-normal"
											>
												Tomorrow
												<span className="ml-auto text-muted-foreground">
													{format(addDays(today, 1), 'E, h:m b')}
												</span>
											</Button>
											<Button
												variant="ghost"
												className="justify-start font-normal"
											>
												This weekend
												<span className="ml-auto text-muted-foreground">
													{format(nextSaturday(today), 'E, h:m b')}
												</span>
											</Button>
											<Button
												variant="ghost"
												className="justify-start font-normal"
											>
												Next week
												<span className="ml-auto text-muted-foreground">
													{format(addDays(today, 7), 'E, h:m b')}
												</span>
											</Button>
										</div>
									</div>
									<div className="p-2">{/* <Calendar /> */}</div>
								</PopoverContent>
							</Popover>
							<TooltipContent>Snooze</TooltipContent>
						</Tooltip>
					</div>
					<div className="ml-auto flex items-center gap-2">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" disabled={!mail}>
									<Reply className="h-4 w-4" />
									<span className="sr-only">Reply</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Reply</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" disabled={!mail}>
									<ReplyAll className="h-4 w-4" />
									<span className="sr-only">Reply all</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Reply all</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" disabled={!mail}>
									<Forward className="h-4 w-4" />
									<span className="sr-only">Forward</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Forward</TooltipContent>
						</Tooltip>
					</div>
					<Separator orientation="vertical" className="mx-2 h-6" />
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" disabled={!mail}>
								<MoreVertical className="h-4 w-4" />
								<span className="sr-only">More</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem>Mark as unread</DropdownMenuItem>
							<DropdownMenuItem>Star thread</DropdownMenuItem>
							<DropdownMenuItem>Add label</DropdownMenuItem>
							<DropdownMenuItem>Mute thread</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</TooltipProvider>
			<Separator />
			{mail ? (
				<div className="flex flex-1 flex-col">
					<div className="flex items-start p-4 gap-2">
						<Button
							className="md:hidden"
							variant="outline"
							size="icon"
							onClick={() => router.back()}
						>
							<ChevronLeft size={20} />
						</Button>
						<div className="flex items-start gap-4 text-sm">
							<Avatar>
								<AvatarImage alt={mail.name} />
								<AvatarFallback>
									{mail.name
										.split(' ')
										.map((chunk) => chunk[0])
										.join('')}
								</AvatarFallback>
							</Avatar>
							<div className="grid gap-1">
								<div className="font-semibold">{mail.name}</div>
								<div className="line-clamp-1 text-xs">
									<span className="font-medium">Reply-To:</span> {mail.email}
								</div>
							</div>
						</div>
						{mail.date && (
							<div className="ml-auto text-xs text-muted-foreground">
								{format(new Date(mail.date), 'PPpp')}
							</div>
						)}
					</div>
					<Separator />
					<ScrollArea className="h-[calc(100vh-150px)] md:h-[calc(100vh-300px)]">
						<div className="flex flex-col gap-2 p-4  max-w-[90%] mx-auto">
							<div className="flex flex-col h-full">
								<div className="flex-1 space-y-4 overflow-y-auto sm:p-4">
									{messages?.map((message, index) => (
										<div key={index} className={'flex gap-2'}>
											{message.sender?._id !== session?.user.id && (
												<div className="h-8 w-8 rounded-full bg-primary flex-shrink-0" />
											)}
											<div
												className={cn(
													'space-y-2 ',
													message.sender?._id === session?.user.id && 'ml-auto'
												)}
											>
												<div className="flex items-center gap-2">
													<span className="text-sm font-medium">
														{message.sender?._id === session?.user.id
															? 'You'
															: message.sender?.name || 'Unknown'}
													</span>
													<span className="text-sm text-muted-foreground">
														{format(new Date(message.createdAt), 'p')}
													</span>
												</div>
												<div
													className={`p-2 sm:p-3 rounded-lg rounded-br-none ${
														message.sender?._id !== session?.user.id
															? 'bg-muted/50'
															: 'bg-blue-100'
													}`}
												>
													<p className="text-sm whitespace-pre-wrap">
														{message.text}
													</p>
												</div>
												{message.sender?._id !== session?.user.id && (
													<div className="flex items-center gap-2">
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
														>
															<Copy className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
														>
															<Download className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
														>
															<ThumbsUp className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
														>
															<ThumbsDown className="h-4 w-4" />
														</Button>
													</div>
												)}
											</div>
										</div>
									))}
								</div>

								{/* <div className="p-4 border-t flex gap-2">
									<input
										value={input}
										onChange={(e) => setInput(e.target.value)}
										className="flex-1 border rounded px-3 py-2"
										placeholder="Type your message..."
									/>
									<Button onClick={handleSend}>Send</Button>
								</div> */}
							</div>
							{/* {messages.map((message, index) => (
								<div
									key={index}
									className={cn(
										'flex gap-2 max-w-[80%]',
										message.role === 'user' && 'ml-auto'
									)}
								>
									{message.role === 'agent' && (
										<div className="h-8 w-8 rounded-full bg-primary flex-shrink-0" />
									)}
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium">
												{message.role === 'agent' ? 'GenerativeAgent' : 'G5'}
											</span>
											<span className="text-sm text-muted-foreground">
												{message.timestamp}
											</span>
										</div>
										<div
											className={`p-3 rounded-lg ${
												message.role === 'agent' ? 'bg-muted/50' : 'bg-blue-100'
											}`}
										>
											<p className="text-sm whitespace-pre-wrap">
												{message.content}
											</p>
										</div>
										{message.role === 'agent' && (
											<div className="flex items-center gap-2">
												<Button variant="ghost" size="icon" className="h-8 w-8">
													<Copy className="h-4 w-4" />
												</Button>
												<Button variant="ghost" size="icon" className="h-8 w-8">
													<Download className="h-4 w-4" />
												</Button>
												<Button variant="ghost" size="icon" className="h-8 w-8">
													<ThumbsUp className="h-4 w-4" />
												</Button>
												<Button variant="ghost" size="icon" className="h-8 w-8">
													<ThumbsDown className="h-4 w-4" />
												</Button>
											</div>
										)}
									</div>
								</div>
							))} */}
						</div>
						<div ref={messagesEndRef} />
					</ScrollArea>

					<Separator className="mt-auto" />
					<div className="p-4">
						<form onSubmit={handleSend}>
							<div className="flex md:grid gap-4">
								<Input
									value={input}
									onChange={(e) => setInput(e.target.value)}
									name="message"
									className="md:hidden flex-1"
									placeholder={`Reply ${mail.name}...`}
								/>
								<Textarea
									value={input}
									onChange={(e) => setInput(e.target.value)}
									name="message"
									className="hidden md:block resize-none"
									placeholder={`Reply ${mail.name}...`}
								/>
								<div className="flex items-end">
									<Button type="submit" size="sm" className="ml-auto">
										Send
									</Button>
								</div>
							</div>
						</form>
					</div>
				</div>
			) : (
				<div className="p-8 text-center text-muted-foreground">
					No message selected
				</div>
			)}
		</div>
	);
}
