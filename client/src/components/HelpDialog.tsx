import { Link } from '../lib/router';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** The workflow, in the order the editor walks you through it. */
const STEPS: { title: string; body: string }[] = [
  {
    title: 'Load your video',
    body: 'Use Load video in the top bar. Works with portrait and landscape video.',
  },
  {
    title: 'Transcribe The Video (Get the words)',
    body: 'Press transcribe. The video is transcripted locally using the whisper model. Switch to a smaller model if it takes too long. Script lets you paste your own text: its line breaks become the caption segments and the transcript supplies the timings.',
  },
  {
    title: 'Fix up the words (optional)',
    body: 'Edit transcript opens the word list: correct a misheard word, nudge a timing, add or delete one. Captions are regrouped around your edits.',
  },
  {
    title: 'Style the captions',
    body: 'Per caption or as a default for all of them: word-by-word, line-by-line, or line with the spoken word highlighted. Pick the font, size, weight, colors and outline. Apply defaults to all pushes the default mode and style onto every caption.',
  },
  {
    title: 'Position the box',
    body: 'Drag the dashed box on the preview to move it, the right-hand handle to set its width, and the bottom handle to set how many lines tall it is. Lines and the Text position grid do the same from the panel. With nothing selected you are moving every caption at once; dragging a selected caption pins that one, and Reset box to default hands it back.',
  },
  {
    title: 'Let long captions page',
    body: 'A caption that wraps to more lines than the box is tall is split into pages. The first page shows, then the next replaces it in the same spot as its words are spoken — set Lines to 1 for a single line that pages, or higher to stack them. Text position also decides where the text sits inside the box when it does not fill it.',
  },
  {
    title: 'Edit on the timeline',
    body: 'Drag blocks and do what you want.  Shift+click to select several and combine them into one. Hold Alt while dragging for fine control, and Ctrl+wheel to zoom. Space plays and pauses, ←/→ nudge, Delete removes the selection.',
  },
  {
    title: 'Export',
    body: 'Export MP4 burns the captions in with ffmpeg on your own machine, exactly as the preview shows them. Save project writes a .captioner.json you can reopen later — reload the video file after opening one.',
  },
];

/** Step-by-step instructions, in the same modal shell as the other dialogs. */
export function HelpDialog({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal wide">
        <h2 className="modal-title">How to use Captioner</h2>
        <ol className="help-steps">
          {STEPS.map((step) => (
            <li key={step.title}>
              <span className="help-step-title">{step.title}</span>
              <p className="help-step-body">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="modal-actions">
          {/* The editor shows ads, and AdSense expects the privacy policy to be
              reachable from any page that carries them. */}
          <div className="modal-actions-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <button className="button ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
