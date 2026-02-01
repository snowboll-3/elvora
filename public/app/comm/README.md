# Elvora Workforce Communication (Universal Module)

## Purpose
Role-based chat between **manager** and **worker** with:
- Text messages
- STT (speech-to-text)
- TTS (text-to-speech)
- Image messages
- Auto-translation hook per worker language

## Roles
- worker: ?role=worker
- manager: ?role=manager

## Translation
Module supports ANY language tag (BCP-47). Real translation can be plugged later via:
window.ElvoraTranslate(text, fromLang, toLang)

## Storage
Workers and messages are stored in localStorage (demo/offline-ready).

## Elvora Workforce Communication Module
Reusable internal role-based communication system.
