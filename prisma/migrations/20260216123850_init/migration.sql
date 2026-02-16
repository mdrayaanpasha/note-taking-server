-- CreateEnum
CREATE TYPE "public"."PassType" AS ENUM ('BGMI', 'VALO', 'NON_GAMING');

-- CreateTable
CREATE TABLE "public"."User" (
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userPassword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."Pass" (
    "passId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."PassType" NOT NULL,
    "proof" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "txnId" TEXT NOT NULL,

    CONSTRAINT "Pass_pkey" PRIMARY KEY ("passId")
);

-- CreateTable
CREATE TABLE "public"."Participation" (
    "participationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "passId" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("participationId")
);

-- CreateTable
CREATE TABLE "public"."UserDetails" (
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "college" TEXT NOT NULL,
    "phoneno" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "avatar" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "UserDetails_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."events" (
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_userEmail_key" ON "public"."User"("userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_userId_eventId_key" ON "public"."Participation"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "public"."Pass" ADD CONSTRAINT "Pass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Participation" ADD CONSTRAINT "Participation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Participation" ADD CONSTRAINT "Participation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Participation" ADD CONSTRAINT "Participation_passId_fkey" FOREIGN KEY ("passId") REFERENCES "public"."Pass"("passId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserDetails" ADD CONSTRAINT "UserDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
