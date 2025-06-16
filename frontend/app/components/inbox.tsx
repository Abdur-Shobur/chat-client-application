'use client';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React from 'react';
import { MailList } from './mail-list';
import { mails } from '../data';

export default function Inbox() {
	return (
		<Tabs defaultValue="all">
			<div className="flex items-center px-4 py-2">
				<h1 className="text-xl font-bold">Inbox</h1>
				<TabsList className="ml-auto">
					<TabsTrigger value="all" className="text-zinc-600 dark:text-zinc-200">
						All Message
					</TabsTrigger>
					<TabsTrigger
						value="unread"
						className="text-zinc-600 dark:text-zinc-200"
					>
						Unread
					</TabsTrigger>
				</TabsList>
			</div>
			<Separator />
			<div className="bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="relative">
					<Input placeholder="Search" className="pl-8" />
				</div>
			</div>
			<TabsContent value="all" className="m-0">
				<MailList items={mails} />
			</TabsContent>
			<TabsContent value="unread" className="m-0">
				<MailList items={mails.filter((item) => !item.read)} />
			</TabsContent>
		</Tabs>
	);
}
