CREATE TABLE "pools" (
	"pool_id" text PRIMARY KEY NOT NULL,
	"name" text,
	"permissions" text,
	"config" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
