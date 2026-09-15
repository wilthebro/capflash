import { z } from 'zod';
import { DEFAULT_MAX_LINES, MAX_LINES } from './style';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const WordSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
});

/** Raw transcript words as uploaded by the user (ids are assigned by the client). */
export const TranscriptWordSchema = z.object({
  text: z.string().min(1),
  start: z.number().min(0),
  end: z.number().min(0),
});
export const TranscriptSchema = z.array(TranscriptWordSchema);

const BoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  // Defaults so `.captioner.json` files saved before the box had a height and
  // alignment still load — they come back as the original 2-line, centred,
  // top-anchored box the editor drew at the time.
  maxLines: z.number().int().min(1).max(MAX_LINES).default(DEFAULT_MAX_LINES),
  alignX: z.enum(['left', 'center', 'right']).default('center'),
  alignY: z.enum(['top', 'middle', 'bottom']).default('top'),
});

const SegmentStyleSchema = z.object({
  fontFamily: z.string().min(1),
  fontSize: z.number().min(1).max(500),
  // Defaults to 400 so projects saved before weights existed keep their look.
  fontWeight: z.number().int().min(100).max(900).default(400),
  color: hexColor,
  outlineColor: hexColor,
  outlineWidth: z.number().min(0).max(50),
  highlightColor: hexColor,
});

const SegmentSchema = z.object({
  id: z.string().min(1),
  wordIds: z.array(z.string()),
  start: z.number().min(0),
  end: z.number().min(0),
  mode: z.enum(['word', 'line', 'highlight']),
  style: SegmentStyleSchema,
  // Absent means "follow the project's default box"; resolved before rendering.
  box: BoxSchema.optional(),
});

const FontRecordSchema = z.object({
  family: z.string().min(1),
  fileName: z.string().min(1),
  dataBase64: z.string().optional(),
});

const VideoMetaSchema = z.object({
  name: z.string(),
  duration: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const ProjectSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  video: VideoMetaSchema.nullable(),
  words: z.array(WordSchema),
  segments: z.array(SegmentSchema),
  defaultStyle: SegmentStyleSchema,
  defaultBox: BoxSchema,
  defaultMode: z.enum(['word', 'line', 'highlight']),
  fonts: z.array(FontRecordSchema),
});

const DisplayEventSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  boxWidth: z.number().positive(),
  alignX: z.enum(['left', 'center', 'right']),
  words: z.array(
    z.object({
      charStart: z.number().int().min(0),
      charEnd: z.number().int().min(0),
      highlighted: z.boolean(),
    }),
  ),
  style: SegmentStyleSchema,
  mode: z.enum(['word', 'line', 'highlight']),
});

export const RenderSpecSchema = z.object({
  version: z.literal(1),
  renderer: z.literal('ass'),
  video: VideoMetaSchema,
  segments: z.array(
    z.object({
      mode: z.enum(['word', 'line', 'highlight']),
      style: SegmentStyleSchema,
      box: BoxSchema,
      lines: z.array(
        z.object({
          text: z.string(),
          topY: z.number(),
          centerX: z.number(),
          widthPx: z.number(),
          words: z.array(
            z.object({
              text: z.string(),
              start: z.number(),
              end: z.number(),
              centerX: z.number(),
              charStart: z.number().int().min(0),
              charEnd: z.number().int().min(0),
            }),
          ),
        }),
      ),
      events: z.array(DisplayEventSchema),
    }),
  ),
  fonts: z.array(FontRecordSchema),
  output: z.object({
    videoCodec: z.literal('libx264'),
    crf: z.number().int().min(0).max(51),
    preset: z.string(),
    audioCodec: z.literal('aac'),
    audioBitrate: z.string(),
  }),
});
