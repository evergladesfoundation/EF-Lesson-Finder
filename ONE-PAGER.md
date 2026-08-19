# The Everglades Lesson Finder

**A one-page explainer for anyone — no background needed.**

## In one breath

The Everglades Lesson Finder is a small chat helper that lives in the corner of the
Everglades Literacy website. A teacher types what they need in ordinary words, and it
hands back the right lessons in a few seconds.

## Why we're building it

The Everglades Foundation gives teachers a free library of lessons about the Everglades,
covering PreK all the way through 12th grade. The lessons are genuinely good. Finding
them is the hard part.

Picture a fourth-grade teacher on a Sunday evening. She has forty minutes before dinner
to plan Tuesday's science block. She needs something about the water cycle, written for
her grade, that lines up with the state standard her district is checking. Today that
means opening a shared folder, guessing from file names, opening a handful of documents,
and reading each one to see whether it fits. Most people run out of patience long before
they run out of folders — and a lesson nobody can find is a lesson nobody teaches.

So the purpose is simple: **make the right lesson easy to find, so good material
actually reaches classrooms.** Every hour a teacher doesn't spend hunting is an hour
back in her week.

## What it feels like to use

A small chat button sits in the bottom corner of the page. Click it and you can ask
things like:

- "Find a 5th-grade lesson on invasive species"
- "Which lessons cover the water cycle?"
- "What standards does *Don't Feed the Gators!* align with?"

Back comes a short answer and a few tidy cards — one per lesson — each showing the
title, the grade it's written for, a sentence about what students do, the standard it
matches, and a link straight to the lesson itself.

Nothing to download. No account to create. It works on a phone.

## How it works, in plain words

Three pieces, each with one job.

**1. The chat window.** This is the part teachers see. It's added to the website with a
single line, the way you'd paste in a video. It's built to keep to itself: it carries its
own styling so it can't accidentally change how the rest of the site looks, and the site
can't accidentally break it either.

**2. The lesson list.** Behind the chat sits one clean list of every lesson — its title,
grade range, topic, standard, a one-sentence summary, and a link. This list is what gets
searched. It's built from the master spreadsheet the education team already keeps by
hand, and where a box in that spreadsheet was left empty, we read the lesson document
itself and fill in the gap from the text on the page.

**3. The quiet helper that keeps the list honest.** A lesson library is never finished —
lessons get rewritten, retired, added. So a behind-the-scenes helper looks through the
shared lesson folders on a schedule, notices what changed, updates the list, writes the
tidied-up version back into the master spreadsheet, and emails the team a short summary
of what moved. Nobody has to remember to do it.

## The choices we made, and why

**We didn't ask anyone to change how they work.** The education team keeps their
spreadsheet and their folders. The helper reads from those and writes back to them. The
words that matter — how a lesson is described, which standard it claims — stay under
human control; the tool is never allowed to overwrite them. It handles the tedious
columns instead: grades, links, titles, what's active and what isn't.

**It's built to fail politely.** The chat window carries its own copy of the lesson list.
If the behind-the-scenes helper is having a bad day, a teacher still gets answers rather
than an error message. She never finds out anything was wrong.

**It's cheap and boring to run.** There's no server humming away that someone has to
look after. The chat window is just a handful of files handed out by a fast worldwide
delivery network — the same approach that makes ordinary web pages load quickly
everywhere.

**We're doing it in stages.** Searching a fixed, trustworthy list came first, because a
tool that gives reliable answers today beats a clever one that might arrive later. The
fuller conversational version — one that follows a thread of questions and can answer in
Spanish or Haitian Creole as easily as English — is built and waiting on the last piece
of paperwork.

## Where things stand

The chat window works end to end and has been demonstrated on a stand-in copy of the
website. The list currently holds 43 active lessons spanning PreK through 12th grade, and
every folder and document link in it has been checked one by one. The behind-the-scenes
helper has been built and run successfully, including writing back to the master
spreadsheet. The conversational, multi-language version is finished but not yet switched
on.

## What comes next

Put the chat window on the real website. Let the overnight refresh run on its own.
Switch on the conversational version and the other languages. And then the part we're
most curious about: watching what teachers actually ask for. Every unanswered question is
a hint about which lesson the Foundation should write next.

---

### For the curious: the actual tools

Named here once, for anyone who wants them, and safely skippable.

| The piece | What it's built with |
| --- | --- |
| The chat window | TypeScript, bundled with Vite, isolated in a shadow DOM |
| Where it's hosted | Cloudflare Workers, serving static assets |
| Where it goes on the site | A Wix custom-code snippet on evergladesliteracy.org |
| The lesson list | Supabase (Postgres), with a copy bundled into the widget as a fallback |
| The scheduled helper | n8n workflows reading Google Drive, writing to Postgres, OneDrive Excel, and Outlook |
| The conversational version | An n8n AI agent with tools for finding and fetching lessons |
