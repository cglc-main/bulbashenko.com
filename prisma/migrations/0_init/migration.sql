-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MediaSection" AS ENUM ('GALLERY', 'FILES');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'FILE');

-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'Aleksandr Albekov',
    "birthday" TEXT,
    "location" TEXT,
    "titleEn" TEXT,
    "titleRu" TEXT,
    "titleSk" TEXT,
    "bioEn" TEXT,
    "bioRu" TEXT,
    "bioSk" TEXT,
    "photoMediaId" TEXT,
    "email" TEXT,
    "github" TEXT,
    "telegram" TEXT,
    "linkedin" TEXT,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleRu" TEXT,
    "titleSk" TEXT,
    "content" TEXT NOT NULL,
    "contentRu" TEXT,
    "contentSk" TEXT,
    "date" TEXT NOT NULL,
    "tags" TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameSk" TEXT,
    "desc" TEXT,
    "descRu" TEXT,
    "descSk" TEXT,
    "stack" TEXT[],
    "github" TEXT,
    "url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "fileId" INTEGER NOT NULL,
    "section" "MediaSection" NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "etag" TEXT NOT NULL,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "hasPreview" BOOLEAN NOT NULL DEFAULT false,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CVEntry" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "role" TEXT,
    "company" TEXT,
    "degree" TEXT,
    "institution" TEXT,
    "name" TEXT,
    "issuer" TEXT,
    "start" TEXT,
    "end" TEXT,
    "desc" TEXT,
    "date" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CVEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "oidcSid" TEXT,
    "idToken" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaItem_fileId_key" ON "MediaItem"("fileId");

-- CreateIndex
CREATE INDEX "MediaItem_section_order_idx" ON "MediaItem"("section", "order");

-- CreateIndex
CREATE INDEX "Session_oidcSid_idx" ON "Session"("oidcSid");

-- CreateIndex
CREATE INDEX "Session_subject_idx" ON "Session"("subject");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_photoMediaId_fkey" FOREIGN KEY ("photoMediaId") REFERENCES "MediaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

