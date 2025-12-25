CREATE INDEX `userId_idx` ON `assets` (`userId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `assets` (`projectId`);--> statement-breakpoint
CREATE INDEX `pageId_idx` ON `elements` (`pageId`);--> statement-breakpoint
CREATE INDEX `parentId_idx` ON `elements` (`parentId`);--> statement-breakpoint
CREATE INDEX `projectId_idx` ON `pages` (`projectId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `projects` (`userId`);