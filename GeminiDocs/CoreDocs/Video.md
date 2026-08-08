> To learn about video generation, see the [Veo](https://ai.google.dev/gemini-api/docs/video) guide.

Gemini models can process videos, enabling many frontier developer use cases
that would have historically required domain specific models.
Some of Gemini's vision capabilities include the ability to: describe, segment,
and extract information from videos, answer questions about video content, and
refer to specific timestamps within a video.

You can provide videos as input to Gemini in the following ways:

| Input method | Max size | Recommended use case |
|---|---|---|
| [File API](https://ai.google.dev/gemini-api/docs/video-understanding#upload-video) | 20GB (paid) / 2GB (free) | Large files (100MB+), long videos (10min+), reusable files. |
| [Cloud Storage Registration](https://ai.google.dev/gemini-api/docs/file-input-methods#registration) | 2GB (per file, no storage limits) | Large files (100MB+), long videos (10min+), persistent, reusable files. |
| [Inline Data](https://ai.google.dev/gemini-api/docs/video-understanding#inline-video) | \< 100MB | Small files (\<100MB), short duration (\<1min), one-off inputs. |
| [YouTube URLs](https://ai.google.dev/gemini-api/docs/video-understanding#youtube) | N/A | Public YouTube videos. |

> **Note:** The [File API](https://ai.google.dev/gemini-api/docs/video-understanding#upload-video) is recommended for most use cases, especially for files larger than 100MB or when you want to reuse the file across multiple requests.

To learn about other file input methods, such as using external URLs or files
stored in Google Cloud, see the
[File input methods](https://ai.google.dev/gemini-api/docs/file-input-methods) guide.

### Upload a video file

The following code downloads a sample video, uploads it using the [Files API](https://ai.google.dev/gemini-api/docs/files),
waits for it to be processed, and then uses the uploaded file reference to
summarize the video.

### Python

    from google import genai
    import base64
    import time

    client = genai.Client()

    myfile = client.files.upload(file="path/to/sample.mp4")

    while not myfile.state or myfile.state.name != "ACTIVE":
        print("Processing video...")
        time.sleep(5)
        myfile = client.files.get(name=myfile.name)

    interaction = client.interactions.create(
        model="gemini-3.6-flash",
        input=[
            {"type": "video", "uri": myfile.uri, "mime_type": myfile.mime_type},
            {"type": "text", "text": "Summarize this video. Then create a quiz with an answer key based on the information in this video."}
        ]
    )

    print(interaction.output_text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const myfile = await ai.files.upload({
        file: "path/to/sample.mp4",
        config: { mimeType: "video/mp4" },
      });

      let getFile = await ai.files.get({ name: myfile.name });
      while (getFile.state === 'PROCESSING') {
          getFile = await ai.files.get({ name: myfile.name });
          console.log(`current file status: ${getFile.state}`);
          console.log('File is still processing, retrying in 5 seconds');

          await new Promise((resolve) => {
              setTimeout(resolve, 5000);
          });
      }
      if (getFile.state === 'FAILED') {
          throw new Error('File processing failed.');
      }

      const interaction = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: [
          { type: "video", uri: myfile.uri, mime_type: myfile.mimeType },
          { type: "text", text: "Summarize this video. Then create a quiz with an answer key based on the information in this video." }
        ],
      });
      console.log(interaction.output_text);
    }

    await main();

### REST

    VIDEO_PATH="path/to/sample.mp4"
    MIME_TYPE=$(file -b --mime-type "${VIDEO_PATH}")
    NUM_BYTES=$(wc -c < "${VIDEO_PATH}")
    DISPLAY_NAME=VIDEO

    tmp_header_file=upload-header.tmp

    echo "Starting file upload..."
    curl "https://generativelanguage.googleapis.com/upload/v1beta/files" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -D ${tmp_header_file} \
      -H "X-Goog-Upload-Protocol: resumable" \
      -H "X-Goog-Upload-Command: start" \
      -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Header-Content-Type: ${MIME_TYPE}" \
      -H "Content-Type: application/json" \
      -d "{'file': {'display_name': '${DISPLAY_NAME}'}}" 2> /dev/null

    upload_url=$(grep -i "x-goog-upload-url: " "${tmp_header_file}" | cut -d" " -f2 | tr -d "\r")
    rm "${tmp_header_file}"

    echo "Uploading video data..."
    curl "${upload_url}" \
      -H "Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Offset: 0" \
      -H "X-Goog-Upload-Command: upload, finalize" \
      --data-binary "@${VIDEO_PATH}" 2> /dev/null > file_info.json

    file_uri=$(jq -r ".file.uri" file_info.json)
    file_name=$(jq -r ".file.name" file_info.json)
    echo file_uri=$file_uri

    echo "File uploaded successfully. File URI: ${file_uri}"

    # Polling loop
    echo "Waiting for file to be processed..."
    while true; do
      curl -s "https://generativelanguage.googleapis.com/v1beta/${file_name}" \
        -H "x-goog-api-key: $GEMINI_API_KEY" > file_status.json
      state=$(jq -r ".state" file_status.json)
      echo "Current state: $state"
      if [ "$state" == "ACTIVE" ]; then
        break
      elif [ "$state" == "FAILED" ]; then
        echo "File processing failed."
        exit 1
      fi
      sleep 5
    done

    echo "Generating content from video..."
    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d '{
          "model": "gemini-3.6-flash",
          "input": [
            {"type": "video", "uri": "'${file_uri}'", "mime_type": "'${MIME_TYPE}'"},
            {"type": "text", "text": "Summarize this video. Then create a quiz with an answer key based on the information in this video."}
          ]
        }' 2> /dev/null > response.json

    jq ".steps[].content[0].text" response.json

Always use the Files API when the total request size (including the file, text
prompt, system instructions, etc.) is larger than 20 MB, the video duration is
significant, or if you intend to use the same video in multiple prompts.
The File API accepts video file formats directly.

To learn more about working with media files, see
[Files API](https://ai.google.dev/gemini-api/docs/files).

### Pass video data inline

Instead of uploading a video file using the File API, you can pass smaller
videos directly in the request. This is suitable for
shorter videos under 20MB total request size.

Here's an example of providing inline video data:

### Python

    from google import genai
    import base64

    video_file_name = "/path/to/your/video.mp4"
    video_bytes = open(video_file_name, 'rb').read()

    client = genai.Client()
    interaction = client.interactions.create(
        model='gemini-3.6-flash',
        input=[
            {"type": "text", "text": "Please summarize the video in 3 sentences."},
            {
                "type": "video",
                "data": base64.b64encode(video_bytes).decode('utf-8'),
                "mime_type": "video/mp4"
            }
        ]
    )
    print(interaction.output_text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    const ai = new GoogleGenAI({});
    const base64VideoFile = fs.readFileSync("path/to/small-sample.mp4", {
      encoding: "base64",
    });

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: [
        { type: "text", text: "Please summarize the video in 3 sentences." },
        {
          type: "video",
          data: base64VideoFile,
          mime_type: "video/mp4",
        }
      ],
    });
    console.log(interaction.output_text);

### REST

> [!NOTE]
> **Note:** If you get an `Argument list too long` error, the base64 encoding of your file might be too long for the curl command line. Use the File API method instead for larger files.

    VIDEO_PATH=/path/to/your/video.mp4

    if [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      B64FLAGS="--input"
    else
      B64FLAGS="-w0"
    fi

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d '{
          "model": "gemini-3.6-flash",
          "input": [
            {"type": "text", "text": "Please summarize the video in 3 sentences."},
            {
              "type": "video",
              "data": "'$(base64 $B64FLAGS $VIDEO_PATH)'",
              "mime_type": "video/mp4"
            }
          ]
        }' 2> /dev/null

### Pass YouTube URLs

> [!WARNING]
> **Preview:** The YouTube URL feature is in preview and is available at no charge. Pricing and rate limits are likely to change.

You can pass YouTube URLs directly to Gemini API as part of your request as follows:

### Python

    from google import genai

    client = genai.Client()
    interaction = client.interactions.create(
        model='gemini-3.6-flash',
        input=[
            {"type": "text", "text": "Please summarize the video in 3 sentences."},
            {
                "type": "video",
                "uri": "https://www.youtube.com/watch?v=9hE5-98ZeCg"
            }
        ]
    )
    print(interaction.output_text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: [
        { type: "text", text: "Please summarize the video in 3 sentences." },
        {
          type: "video",
          uri: "https://www.youtube.com/watch?v=9hE5-98ZeCg",
        }
      ],
    });
    console.log(interaction.output_text);

### REST

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -d '{
          "model": "gemini-3.6-flash",
          "input": [
            {"type": "text", "text": "Please summarize the video in 3 sentences."},
            {
              "type": "video",
              "uri": "https://www.youtube.com/watch?v=9hE5-98ZeCg"
            }
          ]
        }' 2> /dev/null

**Limitations:**

- For the free tier, you can't upload more than 8 hours of YouTube video per day.
- For the paid tier, there is no limit based on video length.
- For models prior to Gemini 2.5, you can upload only 1 video per request. For Gemini 2.5 and later models, you can upload a maximum of 10 videos per request.
- You can only upload public videos (not private or unlisted videos).

## Refer to timestamps in the content

You can ask questions about specific points in time within the video using
timestamps of the form `MM:SS`.

### Python

    prompt = "What are the examples given at 00:05 and 00:10 supposed to show us?"

### JavaScript

    const prompt = "What are the examples given at 00:05 and 00:10 supposed to show us?";

### REST

    PROMPT="What are the examples given at 00:05 and 00:10 supposed to show us?"

## Extract detailed insights from video

Gemini models offer powerful capabilities for understanding video content by
processing information from both the **audio and visual** streams. This lets you
extract a rich set of details, including generating descriptions of what is
happening in a video and answering questions about its content.

For visual descriptions, the model samples the video at a rate of **1 frame
per second** (FPS). This default sampling rate works well for most content, but
note that it may miss details in videos with rapid motion or quick scene changes.

### Python

    prompt = "Describe the key events in this video, providing both audio and visual details. Include timestamps for salient moments."

### JavaScript

    const prompt = "Describe the key events in this video, providing both audio and visual details. Include timestamps for salient moments.";

### REST

    PROMPT="Describe the key events in this video, providing both audio and visual details. Include timestamps for salient moments."

## Supported video formats

Gemini supports the following video format MIME types:

- `video/mp4`
- `video/mpeg`
- `video/mov`
- `video/avi`
- `video/x-flv`
- `video/mpg`
- `video/webm`
- `video/wmv`
- `video/3gpp`

## Technical details about videos

- **Supported models \& context** : All Gemini can process video data.
  - Models with a 1M context window can process videos up to 1 hour long at default media resolution or 3 hours long at low media resolution.
- **File API processing** : When using the File API, videos are stored at 1 frame per second (FPS) and audio is processed at 1Kbps (single channel). Timestamps are added every second.
  - These rates are subject to change in the future for improvements in inference.
- **Token calculation** : Each second of video is tokenized as follows:
  - Individual frames (sampled at 1 FPS):
    - If `media_resolution` is set to low, frames are tokenized at 66 tokens per frame.
    - Otherwise, frames are tokenized at 258 tokens per frame.
  - Audio: 32 tokens per second.
  - Metadata is also included.
  - Total: Approximately 300 tokens per second of video at default media resolution, or 100 tokens per second of video at low media resolution.
- **Medial resolution** : Gemini 3 introduces granular control over multimodal
  vision processing with the `media_resolution` parameter. The
  `media_resolution` parameter determines the
  **maximum number of tokens allocated per input image or video frame.**
  Higher resolutions improve the model's ability to read fine text or identify
  small details, but increase token usage and latency.

  For more details on token calculations, see the [tokens](https://ai.google.dev/gemini-api/docs/tokens) guide.
- **Timestamp format** : When referring to specific moments in a video within your prompt, use the `MM:SS` format (e.g., `01:15` for 1 minute and 15 seconds).

- **Best practices**:

  - Use only one video per prompt request for optimal results.
  - If combining text and a single video, place the text prompt *after* the video part in the `input` array.
  - Be aware that fast action sequences might lose detail due to the 1 FPS sampling rate. Consider slowing down such clips if necessary.

## What's next

This guide shows how to upload video files and generate text outputs from video
inputs. To learn more, see the following resources:

- [System instructions](https://ai.google.dev/gemini-api/docs/text-generation#system-instructions): System instructions let you steer the behavior of the model based on your specific needs and use cases.
- [Files API](https://ai.google.dev/gemini-api/docs/files): Learn more about uploading and managing files for use with Gemini.
- [File prompting strategies](https://ai.google.dev/gemini-api/docs/files#prompt-guide): The Gemini API supports prompting with text, image, audio, and video data, also known as multimodal prompting.
- [Safety guidance](https://ai.google.dev/gemini-api/docs/safety-guidance): Sometimes generative AI models produce unexpected outputs, such as outputs that are inaccurate, biased, or offensive. Post-processing and human evaluation are essential to limit the risk of harm from such outputs.