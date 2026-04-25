ALTER TABLE `apkBuilds` ADD `buildLogs` text;--> statement-breakpoint
ALTER TABLE `users` ADD `resetToken` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `resetTokenExpires` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `emailOtp` varchar(6);--> statement-breakpoint
ALTER TABLE `users` ADD `emailOtpExpires` timestamp;