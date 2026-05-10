CREATE TYPE "public"."attribute_type" AS ENUM('text', 'number', 'decimal', 'boolean', 'enum');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('stocked', 'sold', 'archived');--> statement-breakpoint
CREATE TYPE "public"."sold_platform" AS ENUM('Depop', 'Poshmark', 'eBay', 'Other');--> statement-breakpoint
CREATE TABLE "attribute_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"key" text NOT NULL,
	"type" "attribute_type" NOT NULL,
	"enum_options" text[],
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"display_id" bigserial NOT NULL,
	"category_id" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"location" text,
	"cost" numeric(12, 2),
	"list_price" numeric(12, 2),
	"status" "item_status" DEFAULT 'stocked' NOT NULL,
	"intake_skipped" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_display_id_unique" UNIQUE("display_id"),
	CONSTRAINT "items_intake_skipped_requires_sold" CHECK ("items"."intake_skipped" = false OR "items"."status" = 'sold')
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"blob_path" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"sold_price" numeric(12, 2) NOT NULL,
	"sold_at" timestamp with time zone DEFAULT now() NOT NULL,
	"platform" "sold_platform",
	"buyer_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attribute_definitions" ADD CONSTRAINT "attribute_definitions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attribute_definitions_category_key_unique" ON "attribute_definitions" USING btree ("category_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_item_id_unique" ON "sales" USING btree ("item_id");