/**
 * The landing page's copy as data.
 *
 * The FAQ lives here rather than in JSX for one specific reason: the same array
 * feeds both the rendered questions and the FAQPage structured data, so the two
 * cannot drift apart. Google requires the marked-up text to match the visible
 * text, and a mismatch is a well-known way to earn a manual action.
 *
 * Everything below is a claim about what the app actually does. If a feature
 * changes, this file changes with it — see README.md, which is the source of
 * truth for behaviour.
 */

export interface Feature {
  title: string;
  body: string;
}

export interface Step {
  title: string;
  body: string;
}

export interface ComparisonRow {
  label: string;
  ours: string;
  theirs: string;
}

export interface Faq {
  q: string;
  a: string;
}

export const FEATURES: Feature[] = [
  {
    title: 'Transcription on your own device',
    body: 'Whisper runs in a worker inside your browser, so speech-to-text never touches a server. Pick Tiny, Base or Small — bigger models are more accurate and take longer — and get word-level timings you can then correct by hand.',
  },
  {
    title: 'TikTok-style caption modes',
    body: 'Three ways to show a caption: one word at a time, a whole line, or a line where the word being spoken is picked out. In highlight mode the spoken word is recoloured, bolded and about 10% larger, so the eye lands on it as it is said.',
  },
  {
    title: 'Burn-in MP4 export',
    body: 'Export an MP4 with the captions rendered into the picture itself. There is no separate subtitle file to keep alongside it, and the captions show up in every player and every social app — including the ones that ignore subtitle tracks entirely.',
  },
  {
    title: 'Complete control over the look',
    body: 'Font — the bundled Montserrat, any font on your system, or your own .ttf, .otf or .woff — plus weight, size, text colour, outline colour and width, and the highlight colour. Set it per caption, or once as the default for all of them.',
  },
  {
    title: 'Timeline editing',
    body: 'A caption track sits above the video. Drag a block to move it in time, drag its edges to trim it, and shift-click to select several and merge them into one. Snapping lands on word edges; hold Alt for fine control and Ctrl+wheel to zoom.',
  },
  {
    title: 'Your script decides the line breaks',
    body: 'Paste or upload a script and its line breaks become the caption segments, with the timings still coming from the audio, matched word by word. It is the difference between captions that break wherever the speaker paused and captions that break where you meant them to.',
  },
  {
    title: 'Long captions page in place',
    body: 'Size the caption box and let a long caption run past it: the first page goes up, and the next replaces it in the same spot as its words come round. Set it one line tall for a single line that pages, or taller to stack them.',
  },
  {
    title: 'No watermark, no account, no cap',
    body: 'Nothing is stamped on your export, there is no sign-up, and there is no length limit or export credit to run out of. That goes for every feature on this page — there is no paid tier hiding the good parts.',
  },
];

export const STEPS: Step[] = [
  {
    title: 'Load your video',
    body: 'Portrait or landscape, any format your browser can play. The file is opened locally — it is not sent anywhere.',
  },
  {
    title: 'Get the words',
    body: 'Transcribe the audio on your device, load a JSON file of word timestamps, or paste your own script so the text comes from you and the timings come from the audio.',
  },
  {
    title: 'Style the captions',
    body: 'Choose a mode — word by word, line by line, or line with the spoken word highlighted — then the font, size, weight, colours and outline. Per caption, or as a default pushed to all of them.',
  },
  {
    title: 'Position the box',
    body: 'Drag the caption box on the preview to move it, and its handles to set the width and how many lines tall it is. With nothing selected, the box drives every caption at once.',
  },
  {
    title: 'Export the MP4',
    body: 'The captions are burned into the video and downloaded. Nothing is uploaded, nothing needs installing, and the first export caches the render engine so later ones start immediately.',
  },
];

/**
 * Compared against the shape of a typical upload-based online caption
 * generator. Deliberately general and hedged — no product is named, because the
 * point is the category, not any particular tool.
 */
export const COMPARISON: ComparisonRow[] = [
  { label: 'Cost', ours: 'Free, every feature', theirs: 'A free tier, then credits or a subscription' },
  { label: 'Your video', ours: 'Stays on your device', theirs: 'Uploaded to their servers' },
  { label: 'Watermark', ours: 'None', theirs: 'Often added to the free tier' },
  { label: 'Account', ours: 'Not required', theirs: 'Usually required before you can export' },
  { label: 'Export length', ours: 'Unlimited', theirs: 'Often capped until you pay' },
  { label: 'Offline', ours: 'Works once the model is cached', theirs: 'Needs a connection' },
];

export const FAQS: Faq[] = [
  {
    q: 'Is it really free?',
    a: 'Yes. Transcription, styling and burn-in export are all free, with no account, no export limit and no watermark. The site is paid for by advertising rather than by a paid tier.',
  },
  {
    q: 'Do I have to upload my video to use the caption generator?',
    a: 'No. Your browser opens the file, transcribes it on your device and renders the captions there, so nothing is uploaded at any point.',
  },
  {
    q: 'Is there a watermark on the export?',
    a: 'No. The captions are burned into the picture and nothing else is drawn on it — no logo, no badge, no end card.',
  },
  {
    q: 'What makes a caption "TikTok-style"?',
    a: 'A few large words sitting in a fixed spot, with the word being spoken picked out — usually in a brighter colour, bolder and slightly larger — so the caption reads in time with the voice instead of sitting there as a subtitle block. This editor also does plain word-at-a-time and line-at-a-time captions if you prefer.',
  },
  {
    q: 'Which video formats work?',
    a: 'Anything your browser can play. In practice that means MP4/H.264 and WebM nearly everywhere, and MOV on most machines. If the preview plays it, the export can burn captions into it.',
  },
  {
    q: 'Can I run it locally, or use it offline?',
    a: 'Yes to both. Once the page and the speech model are cached, transcription and export keep working with no connection. And because everything happens in the page, the app can be hosted anywhere — including on your own machine, which is how it is developed.',
  },
  {
    q: 'How accurate is the transcription?',
    a: 'It uses Whisper, the same family of models most local transcription tools use, and you choose the size: Tiny is the quickest and least accurate, Small the most accurate and slowest. Word timings can be nudged and misheard words corrected in the transcript editor, and you can paste a script so the wording is yours while the timings still come from the audio.',
  },
  {
    q: 'Do I need an account, or anything installed?',
    a: 'No account, no installer, no browser extension. Open the page and load a video. The only download is the speech model the first time you transcribe, and the render engine the first time you export.',
  },
  {
    q: 'Can I use the captions commercially?',
    a: 'Yes. Your video and its captions are yours, and nothing here limits what you do with the export. The bundled font is Montserrat, which is licensed under the SIL Open Font License and is free to use commercially.',
  },
  {
    q: 'What does "burn in" mean?',
    a: 'It means the captions are drawn into the picture itself while the video is re-encoded, rather than stored as a separate subtitle track. A burned-in file shows the same captions in every player, editor and social app — including the ones that would otherwise ignore a subtitle track.',
  },
];
