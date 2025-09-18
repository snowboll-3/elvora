
## Deploy na Render (Static Site)
- Build Command: (prazno), Publish Directory: public/
- Security headers: postavi u Render > Settings > Headers (Render ne koristi _headers datoteku).
- Backend (Cloudflare Worker) ostaje gdje je; frontend zove Workera preko postojećih URL-ova.
