The Gemini API supports content generation with images, audio, code, tools, and more. For details on each of these features, read on and check out the task-focused sample code, or read the comprehensive guides.

- [Text generation](https://ai.google.dev/gemini-api/docs/text-generation)
- [Vision](https://ai.google.dev/gemini-api/docs/vision)
- [Audio](https://ai.google.dev/gemini-api/docs/audio)
- [Embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [Long context](https://ai.google.dev/gemini-api/docs/long-context)
- [Code execution](https://ai.google.dev/gemini-api/docs/code-execution)
- [JSON Mode](https://ai.google.dev/gemini-api/docs/json-mode)
- [Function calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [System instructions](https://ai.google.dev/gemini-api/docs/system-instructions)

## Method: models.generateContent

- [Endpoint](https://ai.google.dev/api/generate-content#body.HTTP_TEMPLATE)
- [Path parameters](https://ai.google.dev/api/generate-content#body.PATH_PARAMETERS)
- [Request body](https://ai.google.dev/api/generate-content#body.request_body)
  - [JSON representation](https://ai.google.dev/api/generate-content#body.request_body.SCHEMA_REPRESENTATION)
- [Response body](https://ai.google.dev/api/generate-content#body.response_body)
- [Authorization scopes](https://ai.google.dev/api/generate-content#body.aspect)
- [Example request](https://ai.google.dev/api/generate-content#body.codeSnippets)
  - [Text](https://ai.google.dev/api/generate-content#body.codeSnippets.group)
  - [Image](https://ai.google.dev/api/generate-content#body.codeSnippets.group_1)
  - [Audio](https://ai.google.dev/api/generate-content#body.codeSnippets.group_2)
  - [Video](https://ai.google.dev/api/generate-content#body.codeSnippets.group_3)
  - [PDF](https://ai.google.dev/api/generate-content#body.codeSnippets.group_4)
  - [Chat](https://ai.google.dev/api/generate-content#body.codeSnippets.group_5)
  - [Cache](https://ai.google.dev/api/generate-content#body.codeSnippets.group_6)
  - [Tuned Model](https://ai.google.dev/api/generate-content#body.codeSnippets.group_7)
  - [JSON Mode](https://ai.google.dev/api/generate-content#body.codeSnippets.group_8)
  - [Code execution](https://ai.google.dev/api/generate-content#body.codeSnippets.group_9)
  - [Function Calling](https://ai.google.dev/api/generate-content#body.codeSnippets.group_10)
  - [Generation config](https://ai.google.dev/api/generate-content#body.codeSnippets.group_11)
  - [Safety Settings](https://ai.google.dev/api/generate-content#body.codeSnippets.group_12)
  - [System Instruction](https://ai.google.dev/api/generate-content#body.codeSnippets.group_13)

Generates a model response given an input `GenerateContentRequest`. Refer to the [text generation guide](https://ai.google.dev/gemini-api/docs/text-generation) for detailed usage information. Input capabilities differ between models, including tuned models. Refer to the [model guide](https://ai.google.dev/gemini-api/docs/models/gemini) and [tuning guide](https://ai.google.dev/gemini-api/docs/model-tuning) for details.

### Endpoint

post `https://generativelanguage.googleapis.com/v1beta/{model=models/*}:generateContent`   

### Path parameters

`model` `string` Required. The name of the `Model` to use for generating the completion.

Format: `models/{model}`. It takes the form `models/{model}`.

### Request body

The request body contains data with the following structure:
Fields `contents[]` ``object (`Content`)`` Required. The content of the current conversation with the model.

For single-turn queries, this is a single instance. For multi-turn queries like [chat](https://ai.google.dev/gemini-api/docs/text-generation#chat), this is a repeated field that contains the conversation history and the latest request.
`tools[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.Tool`)`` Optional. A list of `Tools` the `Model` may use to generate the next response.

A `Tool` is a piece of code that enables the system to interact with external systems to perform an action, or set of actions, outside of knowledge and scope of the `Model`. Supported `Tool`s are `Function` and `codeExecution`. Refer to the [Function calling](https://ai.google.dev/gemini-api/docs/function-calling) and the [Code execution](https://ai.google.dev/gemini-api/docs/code-execution) guides to learn more.
`toolConfig` ``object (`https://ai.google.dev/api/caching#ToolConfig`)`` Optional. Tool configuration for any `Tool` specified in the request. Refer to the [Function calling guide](https://ai.google.dev/gemini-api/docs/function-calling#function_calling_mode) for a usage example.
`safetySettings[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.SafetySetting`)`` Optional. A list of unique `SafetySetting` instances for blocking unsafe content.

This will be enforced on the `GenerateContentRequest.contents` and `GenerateContentResponse.candidates`. There should not be more than one setting for each `SafetyCategory` type. The API will block any contents and responses that fail to meet the thresholds set by these settings. This list overrides the default settings for each `SafetyCategory` specified in the safetySettings. If there is no `SafetySetting` for a given `SafetyCategory` provided in the list, the API will use the default safety setting for that category. Harm categories HARM_CATEGORY_HATE_SPEECH, HARM_CATEGORY_SEXUALLY_EXPLICIT, HARM_CATEGORY_DANGEROUS_CONTENT, HARM_CATEGORY_HARASSMENT, HARM_CATEGORY_CIVIC_INTEGRITY, HARM_CATEGORY_JAILBREAK are supported. Refer to the [guide](https://ai.google.dev/gemini-api/docs/safety-settings) for detailed information on available safety settings. Also refer to the [Safety guidance](https://ai.google.dev/gemini-api/docs/safety-guidance) to learn how to incorporate safety considerations in your AI applications.
`systemInstruction` ``object (`Content`)`` Optional. Developer set [system instruction(s)](https://ai.google.dev/gemini-api/docs/system-instructions). Currently, text only.
`generationConfig` ``object (`https://ai.google.dev/api/generate-content#GenerationConfig`)`` Optional. Configuration options for model generation and outputs.
`cachedContent` `string` Optional. The name of the content [cached](https://ai.google.dev/gemini-api/docs/caching) to use as context to serve the prediction. Format: `cachedContents/{cachedContent}`
`serviceTier` ``enum (`ServiceTier`)`` Optional. The service tier of the request.
`store` `boolean` Optional. Configures the logging behavior for a given request. If set, it takes precedence over the project-level logging config.

### Example request

### Text

### Python

    from google import genai

    client = genai.Client()
    response = client.models.generate_content(
        model="gemini-3.6-flash", contents="Write a story about a magic backpack."
    )
    print(response.text)

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Write a story about a magic backpack.",
    });
    console.log(response.text);

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }
    contents := []*genai.Content{
    	genai.NewContentFromText("Write a story about a magic backpack.", genai.RoleUser),
    }
    response, err := client.Models.GenerateContent(ctx, "gemini-3.6-flash", contents, nil)
    if err != nil {
    	log.Fatal(err)
    }
    printResponse(response)

### Shell

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d '{
          "contents": [{
            "parts":[{"text": "Write a story about a magic backpack."}]
            }]
           }' 2> /dev/null

### Java

    Client client = new Client();

    GenerateContentResponse response =
            client.models.generateContent(
                    "gemini-3.6-flash",
                    "Write a story about a magic backpack.",
                    null);

    System.out.println(response.text());

### Image

### Python

    from google import genai
    import PIL.Image

    client = genai.Client()
    organ = PIL.Image.open(media / "organ.jpg")
    response = client.models.generate_content(
        model="gemini-3.6-flash", contents=["Tell me about this instrument", organ]
    )
    print(response.text)

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const organ = await ai.files.upload({
      file: path.join(media, "organ.jpg"),
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        createUserContent([
          "Tell me about this instrument", 
          createPartFromUri(organ.uri, organ.mimeType)
        ]),
      ],
    });
    console.log(response.text);

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    file, err := client.Files.UploadFromPath(
    	ctx, 
    	filepath.Join(getMedia(), "organ.jpg"), 
    	&genai.UploadFileConfig{
    		MIMEType : "image/jpeg",
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }
    parts := []*genai.Part{
    	genai.NewPartFromText("Tell me about this instrument"),
    	genai.NewPartFromURI(file.URI, file.MIMEType),
    }
    contents := []*genai.Content{
    	genai.NewContentFromParts(parts, genai.RoleUser),
    }

    response, err := client.Models.GenerateContent(ctx, "gemini-3.6-flash", contents, nil)
    if err != nil {
    	log.Fatal(err)
    }
    printResponse(response)

### Shell

    # Use a temporary file to hold the base64 encoded image data
    TEMP_B64=$(mktemp)
    trap 'rm -f "$TEMP_B64"' EXIT
    base64 $B64FLAGS $IMG_PATH > "$TEMP_B64"

    # Use a temporary file to hold the JSON payload
    TEMP_JSON=$(mktemp)
    trap 'rm -f "$TEMP_JSON"' EXIT

    cat > "$TEMP_JSON" << EOF
    {
      "contents": [{
        "parts":[
          {"text": "Tell me about this instrument"},
          {
            "inline_data": {
              "mime_type":"image/jpeg",
              "data": "$(cat "$TEMP_B64")"
            }
          }
        ]
      }]
    }
    EOF

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d "@$TEMP_JSON" 2> /dev/null

### Java

    Client client = new Client();

    String path = media_path + "organ.jpg";
    byte[] imageData = Files.readAllBytes(Paths.get(path));

    Content content =
            Content.fromParts(
                    Part.fromText("Tell me about this instrument."),
                    Part.fromBytes(imageData, "image/jpeg"));

    GenerateContentResponse response = client.models.generateContent("gemini-3.6-flash", content, null);

    System.out.println(response.text());

### Audio

### Python

    from google import genai

    client = genai.Client()
    sample_audio = client.files.upload(file=media / "sample.mp3")
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=["Give me a summary of this audio file.", sample_audio],
    )
    print(response.text)

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const audio = await ai.files.upload({
      file: path.join(media, "sample.mp3"),
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        createUserContent([
          "Give me a summary of this audio file.",
          createPartFromUri(audio.uri, audio.mimeType),
        ]),
      ],
    });
    console.log(response.text);

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    file, err := client.Files.UploadFromPath(
    	ctx, 
    	filepath.Join(getMedia(), "sample.mp3"), 
    	&genai.UploadFileConfig{
    		MIMEType : "audio/mpeg",
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }

    parts := []*genai.Part{
    	genai.NewPartFromText("Give me a summary of this audio file."),
    	genai.NewPartFromURI(file.URI, file.MIMEType),
    }

    contents := []*genai.Content{
    	genai.NewContentFromParts(parts, genai.RoleUser),
    }

    response, err := client.Models.GenerateContent(ctx, "gemini-3.6-flash", contents, nil)
    if err != nil {
    	log.Fatal(err)
    }
    printResponse(response)

### Shell

    # Use File API to upload audio data to API request.
    MIME_TYPE=$(file -b --mime-type "${AUDIO_PATH}")
    NUM_BYTES=$(wc -c < "${AUDIO_PATH}")
    DISPLAY_NAME=AUDIO

    tmp_header_file=upload-header.tmp

    # Initial resumable request defining metadata.
    # The upload url is in the response headers dump them to a file.
    curl "${BASE_URL}/upload/v1beta/files?key=${GEMINI_API_KEY}" \
      -D upload-header.tmp \
      -H "X-Goog-Upload-Protocol: resumable" \
      -H "X-Goog-Upload-Command: start" \
      -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Header-Content-Type: ${MIME_TYPE}" \
      -H "Content-Type: application/json" \
      -d "{'file': {'display_name': '${DISPLAY_NAME}'}}" 2> /dev/null

    upload_url=$(grep -i "x-goog-upload-url: " "${tmp_header_file}" | cut -d" " -f2 | tr -d "\r")
    rm "${tmp_header_file}"

    # Upload the actual bytes.
    curl "${upload_url}" \
      -H "Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Offset: 0" \
      -H "X-Goog-Upload-Command: upload, finalize" \
      --data-binary "@${AUDIO_PATH}" 2> /dev/null > file_info.json

    file_uri=$(jq ".file.uri" file_info.json)
    echo file_uri=$file_uri

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d '{
          "contents": [{
            "parts":[
              {"text": "Please describe this file."},
              {"file_data":{"mime_type": "audio/mpeg", "file_uri": '$file_uri'}}]
            }]
           }' 2> /dev/null > response.json

    cat response.json
    echo

    jq ".candidates[].content.parts[].text" response.json

### Video

### Python

    from google import genai
    import time

    client = genai.Client()
    # Video clip (CC BY 3.0) from https://peach.blender.org/download/
    myfile = client.files.upload(file=media / "Big_Buck_Bunny.mp4")
    print(f"{myfile=}")

    # Poll until the video file is completely processed (state becomes ACTIVE).
    while not myfile.state or myfile.state.name != "ACTIVE":
        print("Processing video...")
        print("File state:", myfile.state)
        time.sleep(5)
        myfile = client.files.get(name=myfile.name)

    response = client.models.generate_content(
        model="gemini-3.6-flash", contents=[myfile, "Describe this video clip"]
    )
    print(f"{response.text=}")

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let video = await ai.files.upload({
      file: path.join(media, 'Big_Buck_Bunny.mp4'),
    });

    // Poll until the video file is completely processed (state becomes ACTIVE).
    while (!video.state || video.state.toString() !== 'ACTIVE') {
      console.log('Processing video...');
      console.log('File state: ', video.state);
      await sleep(5000);
      video = await ai.files.get({name: video.name});
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        createUserContent([
          "Describe this video clip",
          createPartFromUri(video.uri, video.mimeType),
        ]),
      ],
    });
    console.log(response.text);

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    file, err := client.Files.UploadFromPath(
    	ctx, 
    	filepath.Join(getMedia(), "Big_Buck_Bunny.mp4"), 
    	&genai.UploadFileConfig{
    		MIMEType : "video/mp4",
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }

    // Poll until the video file is completely processed (state becomes ACTIVE).
    for file.State == genai.FileStateUnspecified || file.State != genai.FileStateActive {
    	fmt.Println("Processing video...")
    	fmt.Println("File state:", file.State)
    	time.Sleep(5 * time.Second)

    	file, err = client.Files.Get(ctx, file.Name, nil)
    	if err != nil {
    		log.Fatal(err)
    	}
    }

    parts := []*genai.Part{
    	genai.NewPartFromText("Describe this video clip"),
    	genai.NewPartFromURI(file.URI, file.MIMEType),
    }

    contents := []*genai.Content{
    	genai.NewContentFromParts(parts, genai.RoleUser),
    }

    response, err := client.Models.GenerateContent(ctx, "gemini-3.6-flash", contents, nil)
    if err != nil {
    	log.Fatal(err)
    }
    printResponse(response)

### Shell

    # Use File API to upload audio data to API request.
    MIME_TYPE=$(file -b --mime-type "${VIDEO_PATH}")
    NUM_BYTES=$(wc -c < "${VIDEO_PATH}")
    DISPLAY_NAME=VIDEO

    # Initial resumable request defining metadata.
    # The upload url is in the response headers dump them to a file.
    curl "${BASE_URL}/upload/v1beta/files?key=${GEMINI_API_KEY}" \
      -D "${tmp_header_file}" \
      -H "X-Goog-Upload-Protocol: resumable" \
      -H "X-Goog-Upload-Command: start" \
      -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Header-Content-Type: ${MIME_TYPE}" \
      -H "Content-Type: application/json" \
      -d "{'file': {'display_name': '${DISPLAY_NAME}'}}" 2> /dev/null

    upload_url=$(grep -i "x-goog-upload-url: " "${tmp_header_file}" | cut -d" " -f2 | tr -d "\r")
    rm "${tmp_header_file}"

    # Upload the actual bytes.
    curl "${upload_url}" \
      -H "Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Offset: 0" \
      -H "X-Goog-Upload-Command: upload, finalize" \
      --data-binary "@${VIDEO_PATH}" 2> /dev/null > file_info.json

    file_uri=$(jq ".file.uri" file_info.json)
    echo file_uri=$file_uri

    state=$(jq ".file.state" file_info.json)
    echo state=$state

    name=$(jq ".file.name" file_info.json)
    echo name=$name

    while [[ "($state)" = *"PROCESSING"* ]];
    do
      echo "Processing video..."
      sleep 5
      # Get the file of interest to check state
      curl https://generativelanguage.googleapis.com/v1beta/files/$name > file_info.json
      state=$(jq ".file.state" file_info.json)
    done

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d '{
          "contents": [{
            "parts":[
              {"text": "Transcribe the audio from this video, giving timestamps for salient events in the video. Also provide visual descriptions."},
              {"file_data":{"mime_type": "video/mp4", "file_uri": '$file_uri'}}]
            }]
           }' 2> /dev/null > response.json

    cat response.json
    echo

    jq ".candidates[].content.parts[].text" response.json

### PDF

### Python

    from google import genai

    client = genai.Client()
    sample_pdf = client.files.upload(file=media / "test.pdf")
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=["Give me a summary of this document:", sample_pdf],
    )
    print(f"{response.text=}")

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    file, err := client.Files.UploadFromPath(
    	ctx, 
    	filepath.Join(getMedia(), "test.pdf"), 
    	&genai.UploadFileConfig{
    		MIMEType : "application/pdf",
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }

    parts := []*genai.Part{
    	genai.NewPartFromText("Give me a summary of this document:"),
    	genai.NewPartFromURI(file.URI, file.MIMEType),
    }

    contents := []*genai.Content{
    	genai.NewContentFromParts(parts, genai.RoleUser),
    }

    response, err := client.Models.GenerateContent(ctx, "gemini-3.6-flash", contents, nil)
    if err != nil {
    	log.Fatal(err)
    }
    printResponse(response)

### Shell

    MIME_TYPE=$(file -b --mime-type "${PDF_PATH}")
    NUM_BYTES=$(wc -c < "${PDF_PATH}")
    DISPLAY_NAME=TEXT


    echo $MIME_TYPE
    tmp_header_file=upload-header.tmp

    # Initial resumable request defining metadata.
    # The upload url is in the response headers dump them to a file.
    curl "${BASE_URL}/upload/v1beta/files?key=${GEMINI_API_KEY}" \
      -D upload-header.tmp \
      -H "X-Goog-Upload-Protocol: resumable" \
      -H "X-Goog-Upload-Command: start" \
      -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Header-Content-Type: ${MIME_TYPE}" \
      -H "Content-Type: application/json" \
      -d "{'file': {'display_name': '${DISPLAY_NAME}'}}" 2> /dev/null

    upload_url=$(grep -i "x-goog-upload-url: " "${tmp_header_file}" | cut -d" " -f2 | tr -d "\r")
    rm "${tmp_header_file}"

    # Upload the actual bytes.
    curl "${upload_url}" \
      -H "Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Offset: 0" \
      -H "X-Goog-Upload-Command: upload, finalize" \
      --data-binary "@${PDF_PATH}" 2> /dev/null > file_info.json

    file_uri=$(jq ".file.uri" file_info.json)
    echo file_uri=$file_uri

    # Now generate content using that file
    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d '{
          "contents": [{
            "parts":[
              {"text": "Can you add a few more lines to this poem?"},
              {"file_data":{"mime_type": "application/pdf", "file_uri": '$file_uri'}}]
            }]
           }' 2> /dev/null > response.json

    cat response.json
    echo

    jq ".candidates[].content.parts[].text" response.json

### Chat

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()
    # Pass initial history using the "history" argument
    chat = client.chats.create(
        model="gemini-3.6-flash",
        history=[
            types.Content(role="user", parts=[types.Part(text="Hello")]),
            types.Content(
                role="model",
                parts=[
                    types.Part(
                        text="Great to meet you. What would you like to know?"
                    )
                ],
            ),
        ],
    )
    response = chat.send_message(message="I have 2 dogs in my house.")
    print(response.text)
    response = chat.send_message(message="How many paws are in my house?")
    print(response.text)

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const chat = ai.chats.create({
      model: "gemini-3.6-flash",
      history: [
        {
          role: "user",
          parts: [{ text: "Hello" }],
        },
        {
          role: "model",
          parts: [{ text: "Great to meet you. What would you like to know?" }],
        },
      ],
    });

    const response1 = await chat.sendMessage({
      message: "I have 2 dogs in my house.",
    });
    console.log("Chat response 1:", response1.text);

    const response2 = await chat.sendMessage({
      message: "How many paws are in my house?",
    });
    console.log("Chat response 2:", response2.text);

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    // Pass initial history using the History field.
    history := []*genai.Content{
    	genai.NewContentFromText("Hello", genai.RoleUser),
    	genai.NewContentFromText("Great to meet you. What would you like to know?", genai.RoleModel),
    }

    chat, err := client.Chats.Create(ctx, "gemini-3.6-flash", nil, history)
    if err != nil {
    	log.Fatal(err)
    }

    firstResp, err := chat.SendMessage(ctx, genai.Part{Text: "I have 2 dogs in my house."})
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Println(firstResp.Text())

    secondResp, err := chat.SendMessage(ctx, genai.Part{Text: "How many paws are in my house?"})
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Println(secondResp.Text())

### Shell

    curl https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY \
        -H 'Content-Type: application/json' \
        -X POST \
        -d '{
          "contents": [
            {"role":"user",
             "parts":[{
               "text": "Hello"}]},
            {"role": "model",
             "parts":[{
               "text": "Great to meet you. What would you like to know?"}]},
            {"role":"user",
             "parts":[{
               "text": "I have two dogs in my house. How many paws are in my house?"}]},
          ]
        }' 2> /dev/null | grep "text"

### Java

    Client client = new Client();

    Content userContent = Content.fromParts(Part.fromText("Hello"));
    Content modelContent =
            Content.builder()
                    .role("model")
                    .parts(
                            Collections.singletonList(
                                    Part.fromText("Great to meet you. What would you like to know?")
                            )
                    ).build();

    Chat chat = client.chats.create(
            "gemini-3.6-flash",
            GenerateContentConfig.builder()
                    .systemInstruction(userContent)
                    .systemInstruction(modelContent)
                    .build()
    );

    GenerateContentResponse response1 = chat.sendMessage("I have 2 dogs in my house.");
    System.out.println(response1.text());

    GenerateContentResponse response2 = chat.sendMessage("How many paws are in my house?");
    System.out.println(response2.text());

### Cache

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()
    document = client.files.upload(file=media / "a11.txt")
    model_name = "gemini-3.6-flash"

    cache = client.caches.create(
        model=model_name,
        config=types.CreateCachedContentConfig(
            contents=[document],
            system_instruction="You are an expert analyzing transcripts.",
        ),
    )
    print(cache)

    response = client.models.generate_content(
        model=model_name,
        contents="Please summarize this transcript",
        config=types.GenerateContentConfig(cached_content=cache.name),
    )
    print(response.text)

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const filePath = path.join(media, "a11.txt");
    const document = await ai.files.upload({
      file: filePath,
      config: { mimeType: "text/plain" },
    });
    console.log("Uploaded file name:", document.name);
    const modelName = "gemini-3.6-flash";

    const contents = [
      createUserContent(createPartFromUri(document.uri, document.mimeType)),
    ];

    const cache = await ai.caches.create({
      model: modelName,
      config: {
        contents: contents,
        systemInstruction: "You are an expert analyzing transcripts.",
      },
    });
    console.log("Cache created:", cache);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Please summarize this transcript",
      config: { cachedContent: cache.name },
    });
    console.log("Response text:", response.text);

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"), 
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    modelName := "gemini-3.6-flash"
    document, err := client.Files.UploadFromPath(
    	ctx, 
    	filepath.Join(getMedia(), "a11.txt"), 
    	&genai.UploadFileConfig{
    		MIMEType : "text/plain",
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }
    parts := []*genai.Part{
    	genai.NewPartFromURI(document.URI, document.MIMEType),
    }
    contents := []*genai.Content{
    	genai.NewContentFromParts(parts, genai.RoleUser),
    }
    cache, err := client.Caches.Create(ctx, modelName, &genai.CreateCachedContentConfig{
    	Contents: contents,
    	SystemInstruction: genai.NewContentFromText(
    		"You are an expert analyzing transcripts.", genai.RoleUser,
    	),
    })
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Println("Cache created:")
    fmt.Println(cache)

    // Use the cache for generating content.
    response, err := client.Models.GenerateContent(
    	ctx,
    	modelName,
    	genai.Text("Please summarize this transcript"),
    	&genai.GenerateContentConfig{
    		CachedContent: cache.Name,
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }
    printResponse(response)

### Tuned Model

### Python

    # With Gemini 2 we're launching a new SDK. See the following doc for details.
    # https://ai.google.dev/gemini-api/docs/migrate

### JSON Mode

### Python

    from google import genai
    from google.genai import types
    from typing_extensions import TypedDict

    class Recipe(TypedDict):
        recipe_name: str
        ingredients: list[str]

    client = genai.Client()
    result = client.models.generate_content(
        model="gemini-3.6-flash",
        contents="List a few popular cookie recipes.",
        config=types.GenerateContentConfig(
            response_mime_type="application/json", response_schema=list[Recipe]
        ),
    )
    print(result)

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "List a few popular cookie recipes.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              recipeName: { type: "string" },
              ingredients: { type: "array", items: { type: "string" } },
            },
            required: ["recipeName", "ingredients"],
          },
        },
      },
    });
    console.log(response.text);

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"), 
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    schema := &genai.Schema{
    	Type: genai.TypeArray,
    	Items: &genai.Schema{
    		Type: genai.TypeObject,
    		Properties: map[string]*genai.Schema{
    			"recipe_name": {Type: genai.TypeString},
    			"ingredients": {
    				Type:  genai.TypeArray,
    				Items: &genai.Schema{Type: genai.TypeString},
    			},
    		},
    		Required: []string{"recipe_name"},
    	},
    }

    config := &genai.GenerateContentConfig{
    	ResponseMIMEType: "application/json",
    	ResponseSchema:   schema,
    }

    response, err := client.Models.GenerateContent(
    	ctx,
    	"gemini-3.6-flash",
    	genai.Text("List a few popular cookie recipes."),
    	config,
    )
    if err != nil {
    	log.Fatal(err)
    }
    printResponse(response)

### Shell

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
        "contents": [{
          "parts":[
            {"text": "List 5 popular cookie recipes"}
            ]
        }],
        "generationConfig": {
            "response_mime_type": "application/json",
            "response_schema": {
              "type": "ARRAY",
              "items": {
                "type": "OBJECT",
                "properties": {
                  "recipe_name": {"type":"STRING"},
                }
              }
            }
        }
    }' 2> /dev/null | head

### Java

    Client client = new Client();

    Schema recipeSchema = Schema.builder()
            .type(Array.class.getSimpleName())
            .items(Schema.builder()
                    .type(Object.class.getSimpleName())
                    .properties(
                            Map.of("recipe_name", Schema.builder()
                                            .type(String.class.getSimpleName())
                                            .build(),
                                    "ingredients", Schema.builder()
                                            .type(Array.class.getSimpleName())
                                            .items(Schema.builder()
                                                    .type(String.class.getSimpleName())
                                                    .build())
                                            .build())
                    )
                    .required(List.of("recipe_name", "ingredients"))
                    .build())
            .build();

    GenerateContentConfig config =
            GenerateContentConfig.builder()
                    .responseMimeType("application/json")
                    .responseSchema(recipeSchema)
                    .build();

    GenerateContentResponse response =
            client.models.generateContent(
                    "gemini-3.6-flash",
                    "List a few popular cookie recipes.",
                    config);

    System.out.println(response.text());

### Code execution

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=(
            "Write and execute code that calculates the sum of the first 50 prime numbers. "
            "Ensure that only the executable code and its resulting output are generated."
        ),
    )
    # Each part may contain text, executable code, or an execution result.
    for part in response.candidates[0].content.parts:
        print(part, "\n")

    print("-" * 80)
    # The .text accessor concatenates the parts into a markdown-formatted text.
    print("\n", response.text)

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    response, err := client.Models.GenerateContent(
    	ctx,
    	"gemini-3.6-flash",
    	genai.Text(
    		`Write and execute code that calculates the sum of the first 50 prime numbers.
    		 Ensure that only the executable code and its resulting output are generated.`,
    	),
    	&genai.GenerateContentConfig{},
    )
    if err != nil {
    	log.Fatal(err)
    }

    // Print the response.
    printResponse(response)

    fmt.Println("---")
    fmt.Println(response.Text())

### Java

    Client client = new Client();

    String prompt = """
            Write and execute code that calculates the sum of the first 50 prime numbers.
            Ensure that only the executable code and its resulting output are generated.
            """;

    GenerateContentResponse response =
            client.models.generateContent(
                    "gemini-3.6-flash",
                    prompt,
                    null);

    for (Part part : response.candidates().get().getFirst().content().get().parts().get()) {
        System.out.println(part + "\n");
    }

    System.out.println("-".repeat(80));
    System.out.println(response.text());

### Function Calling

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()

    def add(a: float, b: float) -> float:
        """returns a + b."""
        return a + b

    def subtract(a: float, b: float) -> float:
        """returns a - b."""
        return a - b

    def multiply(a: float, b: float) -> float:
        """returns a * b."""
        return a * b

    def divide(a: float, b: float) -> float:
        """returns a / b."""
        return a / b

    # Create a chat session; function calling (via tools) is enabled in the config.
    chat = client.chats.create(
        model="gemini-3.6-flash",
        config=types.GenerateContentConfig(tools=[add, subtract, multiply, divide]),
    )
    response = chat.send_message(
        message="I have 57 cats, each owns 44 mittens, how many mittens is that in total?"
    )
    print(response.text)

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }
    modelName := "gemini-3.6-flash"

    // Create the function declarations for arithmetic operations.
    addDeclaration := createArithmeticToolDeclaration("addNumbers", "Return the result of adding two numbers.")
    subtractDeclaration := createArithmeticToolDeclaration("subtractNumbers", "Return the result of subtracting the second number from the first.")
    multiplyDeclaration := createArithmeticToolDeclaration("multiplyNumbers", "Return the product of two numbers.")
    divideDeclaration := createArithmeticToolDeclaration("divideNumbers", "Return the quotient of dividing the first number by the second.")

    // Group the function declarations as a tool.
    tools := []*genai.Tool{
    	{
    		FunctionDeclarations: []*genai.FunctionDeclaration{
    			addDeclaration,
    			subtractDeclaration,
    			multiplyDeclaration,
    			divideDeclaration,
    		},
    	},
    }

    // Create the content prompt.
    contents := []*genai.Content{
    	genai.NewContentFromText(
    		"I have 57 cats, each owns 44 mittens, how many mittens is that in total?", genai.RoleUser,
    	),
    }

    // Set up the generate content configuration with function calling enabled.
    config := &genai.GenerateContentConfig{
    	Tools: tools,
    	ToolConfig: &genai.ToolConfig{
    		FunctionCallingConfig: &genai.FunctionCallingConfig{
    			// The mode equivalent to FunctionCallingConfigMode.ANY in JS.
    			Mode: genai.FunctionCallingConfigModeAny,
    		},
    	},
    }

    genContentResp, err := client.Models.GenerateContent(ctx, modelName, contents, config)
    if err != nil {
    	log.Fatal(err)
    }

    // Assume the response includes a list of function calls.
    if len(genContentResp.FunctionCalls()) == 0 {
    	log.Println("No function call returned from the AI.")
    	return nil
    }
    functionCall := genContentResp.FunctionCalls()[0]
    log.Printf("Function call: %+v\n", functionCall)

    // Marshal the Args map into JSON bytes.
    argsMap, err := json.Marshal(functionCall.Args)
    if err != nil {
    	log.Fatal(err)
    }

    // Unmarshal the JSON bytes into the ArithmeticArgs struct.
    var args ArithmeticArgs
    if err := json.Unmarshal(argsMap, &args); err != nil {
    	log.Fatal(err)
    }

    // Map the function name to the actual arithmetic function.
    var result float64
    switch functionCall.Name {
    	case "addNumbers":
    		result = add(args.FirstParam, args.SecondParam)
    	case "subtractNumbers":
    		result = subtract(args.FirstParam, args.SecondParam)
    	case "multiplyNumbers":
    		result = multiply(args.FirstParam, args.SecondParam)
    	case "divideNumbers":
    		result = divide(args.FirstParam, args.SecondParam)
    	default:
    		return fmt.Errorf("unimplemented function: %s", functionCall.Name)
    }
    log.Printf("Function result: %v\n", result)

    // Prepare the final result message as content.
    resultContents := []*genai.Content{
    	genai.NewContentFromText("The final result is " + fmt.Sprintf("%v", result), genai.RoleUser),
    }

    // Use GenerateContent to send the final result.
    finalResponse, err := client.Models.GenerateContent(ctx, modelName, resultContents, &genai.GenerateContentConfig{})
    if err != nil {
    	log.Fatal(err)
    }

    printResponse(finalResponse)

### Node.js

      // Make sure to include the following import:
      // import {GoogleGenAI} from '@google/genai';
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      /**
       * The add function returns the sum of two numbers.
       * @param {number} a
       * @param {number} b
       * @returns {number}
       */
      function add(a, b) {
        return a + b;
      }

      /**
       * The subtract function returns the difference (a - b).
       * @param {number} a
       * @param {number} b
       * @returns {number}
       */
      function subtract(a, b) {
        return a - b;
      }

      /**
       * The multiply function returns the product of two numbers.
       * @param {number} a
       * @param {number} b
       * @returns {number}
       */
      function multiply(a, b) {
        return a * b;
      }

      /**
       * The divide function returns the quotient of a divided by b.
       * @param {number} a
       * @param {number} b
       * @returns {number}
       */
      function divide(a, b) {
        return a / b;
      }

      const addDeclaration = {
        name: "addNumbers",
        parameters: {
          type: "object",
          description: "Return the result of adding two numbers.",
          properties: {
            firstParam: {
              type: "number",
              description:
                "The first parameter which can be an integer or a floating point number.",
            },
            secondParam: {
              type: "number",
              description:
                "The second parameter which can be an integer or a floating point number.",
            },
          },
          required: ["firstParam", "secondParam"],
        },
      };

      const subtractDeclaration = {
        name: "subtractNumbers",
        parameters: {
          type: "object",
          description:
            "Return the result of subtracting the second number from the first.",
          properties: {
            firstParam: {
              type: "number",
              description: "The first parameter.",
            },
            secondParam: {
              type: "number",
              description: "The second parameter.",
            },
          },
          required: ["firstParam", "secondParam"],
        },
      };

      const multiplyDeclaration = {
        name: "multiplyNumbers",
        parameters: {
          type: "object",
          description: "Return the product of two numbers.",
          properties: {
            firstParam: {
              type: "number",
              description: "The first parameter.",
            },
            secondParam: {
              type: "number",
              description: "The second parameter.",
            },
          },
          required: ["firstParam", "secondParam"],
        },
      };

      const divideDeclaration = {
        name: "divideNumbers",
        parameters: {
          type: "object",
          description:
            "Return the quotient of dividing the first number by the second.",
          properties: {
            firstParam: {
              type: "number",
              description: "The first parameter.",
            },
            secondParam: {
              type: "number",
              description: "The second parameter.",
            },
          },
          required: ["firstParam", "secondParam"],
        },
      };

      // Step 1: Call generateContent with function calling enabled.
      const generateContentResponse = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents:
          "I have 57 cats, each owns 44 mittens, how many mittens is that in total?",
        config: {
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.ANY,
            },
          },
          tools: [
            {
              functionDeclarations: [
                addDeclaration,
                subtractDeclaration,
                multiplyDeclaration,
                divideDeclaration,
              ],
            },
          ],
        },
      });

      // Step 2: Extract the function call.(
      // Assuming the response contains a 'functionCalls' array.
      const functionCall =
        generateContentResponse.functionCalls &&
        generateContentResponse.functionCalls[0];
      console.log(functionCall);

      // Parse the arguments.
      const args = functionCall.args;
      // Expected args format: { firstParam: number, secondParam: number }

      // Step 3: Invoke the actual function based on the function name.
      const functionMapping = {
        addNumbers: add,
        subtractNumbers: subtract,
        multiplyNumbers: multiply,
        divideNumbers: divide,
      };
      const func = functionMapping[functionCall.name];
      if (!func) {
        console.error("Unimplemented error:", functionCall.name);
        return generateContentResponse;
      }
      const resultValue = func(args.firstParam, args.secondParam);
      console.log("Function result:", resultValue);

      // Step 4: Use the chat API to send the result as the final answer.
      const chat = ai.chats.create({ model: "gemini-3.6-flash" });
      const chatResponse = await chat.sendMessage({
        message: "The final result is " + resultValue,
      });
      console.log(chatResponse.text);
      return chatResponse;
    }

### Shell


    cat > tools.json << EOF
    {
      "function_declarations": [
        {
          "name": "enable_lights",
          "description": "Turn on the lighting system."
        },
        {
          "name": "set_light_color",
          "description": "Set the light color. Lights must be enabled for this to work.",
          "parameters": {
            "type": "object",
            "properties": {
              "rgb_hex": {
                "type": "string",
                "description": "The light color as a 6-digit hex string, e.g. ff0000 for red."
              }
            },
            "required": [
              "rgb_hex"
            ]
          }
        },
        {
          "name": "stop_lights",
          "description": "Turn off the lighting system."
        }
      ]
    } 
    EOF

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -d @<(echo '
      {
        "system_instruction": {
          "parts": {
            "text": "You are a helpful lighting system bot. You can turn lights on and off, and you can set the color. Do not perform any other tasks."
          }
        },
        "tools": ['$(cat tools.json)'],

        "tool_config": {
          "function_calling_config": {"mode": "auto"}
        },

        "contents": {
          "role": "user",
          "parts": {
            "text": "Turn on the lights please."
          }
        }
      }
    ') 2>/dev/null |sed -n '/"content"/,/"finishReason"/p'

### Java

    Client client = new Client();

    FunctionDeclaration addFunction =
            FunctionDeclaration.builder()
                    .name("addNumbers")
                    .parameters(
                            Schema.builder()
                                    .type("object")
                                    .properties(Map.of(
                                            "firstParam", Schema.builder().type("number").description("First number").build(),
                                            "secondParam", Schema.builder().type("number").description("Second number").build()))
                                    .required(Arrays.asList("firstParam", "secondParam"))
                                    .build())
                    .build();

    FunctionDeclaration subtractFunction =
            FunctionDeclaration.builder()
                    .name("subtractNumbers")
                    .parameters(
                            Schema.builder()
                                    .type("object")
                                    .properties(Map.of(
                                            "firstParam", Schema.builder().type("number").description("First number").build(),
                                            "secondParam", Schema.builder().type("number").description("Second number").build()))
                                    .required(Arrays.asList("firstParam", "secondParam"))
                                    .build())
                    .build();

    FunctionDeclaration multiplyFunction =
            FunctionDeclaration.builder()
                    .name("multiplyNumbers")
                    .parameters(
                            Schema.builder()
                                    .type("object")
                                    .properties(Map.of(
                                            "firstParam", Schema.builder().type("number").description("First number").build(),
                                            "secondParam", Schema.builder().type("number").description("Second number").build()))
                                    .required(Arrays.asList("firstParam", "secondParam"))
                                    .build())
                    .build();

    FunctionDeclaration divideFunction =
            FunctionDeclaration.builder()
                    .name("divideNumbers")
                    .parameters(
                            Schema.builder()
                                    .type("object")
                                    .properties(Map.of(
                                            "firstParam", Schema.builder().type("number").description("First number").build(),
                                            "secondParam", Schema.builder().type("number").description("Second number").build()))
                                    .required(Arrays.asList("firstParam", "secondParam"))
                                    .build())
                    .build();

    GenerateContentConfig config = GenerateContentConfig.builder()
            .toolConfig(ToolConfig.builder().functionCallingConfig(
                    FunctionCallingConfig.builder().mode("ANY").build()
            ).build())
            .tools(
                    Collections.singletonList(
                            Tool.builder().functionDeclarations(
                                    Arrays.asList(
                                            addFunction,
                                            subtractFunction,
                                            divideFunction,
                                            multiplyFunction
                                    )
                            ).build()

                    )
            )
            .build();

    GenerateContentResponse response =
            client.models.generateContent(
                    "gemini-3.6-flash",
                    "I have 57 cats, each owns 44 mittens, how many mittens is that in total?",
                    config);


    if (response.functionCalls() == null || response.functionCalls().isEmpty()) {
        System.err.println("No function call received");
        return null;
    }

    var functionCall = response.functionCalls().getFirst();
    String functionName = functionCall.name().get();
    var arguments = functionCall.args();

    Map<String, BiFunction<Double, Double, Double>> functionMapping = new HashMap<>();
    functionMapping.put("addNumbers", (a, b) -> a + b);
    functionMapping.put("subtractNumbers", (a, b) -> a - b);
    functionMapping.put("multiplyNumbers", (a, b) -> a * b);
    functionMapping.put("divideNumbers", (a, b) -> b != 0 ? a / b : Double.NaN);

    BiFunction<Double, Double, Double> function = functionMapping.get(functionName);

    Number firstParam = (Number) arguments.get().get("firstParam");
    Number secondParam = (Number) arguments.get().get("secondParam");
    Double result = function.apply(firstParam.doubleValue(), secondParam.doubleValue());

    System.out.println(result);

### Generation config

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents="Tell me a story about a magic backpack.",
        config=types.GenerateContentConfig(
            candidate_count=1,
            stop_sequences=["x"],
            max_output_tokens=20,
            temperature=1.0,
        ),
    )
    print(response.text)

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Tell me a story about a magic backpack.",
      config: {
        candidateCount: 1,
        stopSequences: ["x"],
        maxOutputTokens: 20,
        temperature: 1.0,
      },
    });

    console.log(response.text);

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    // Create local variables for parameters.
    candidateCount := int32(1)
    maxOutputTokens := int32(20)
    temperature := float32(1.0)

    response, err := client.Models.GenerateContent(
    	ctx,
    	"gemini-3.6-flash",
    	genai.Text("Tell me a story about a magic backpack."),
    	&genai.GenerateContentConfig{
    		CandidateCount:  candidateCount,
    		StopSequences:   []string{"x"},
    		MaxOutputTokens: maxOutputTokens,
    		Temperature:     &temperature,
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }

    printResponse(response)

### Shell

    curl https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY \
        -H 'Content-Type: application/json' \
        -X POST \
        -d '{
            "contents": [{
                "parts":[
                    {"text": "Explain how AI works"}
                ]
            }],
            "generationConfig": {
                "stopSequences": [
                    "Title"
                ],
                "temperature": 1.0,
                "maxOutputTokens": 800,
                "topP": 0.8,
                "topK": 10
            }
        }'  2> /dev/null | grep "text"

### Java

    Client client = new Client();

    GenerateContentConfig config =
            GenerateContentConfig.builder()
                    .candidateCount(1)
                    .stopSequences(List.of("x"))
                    .maxOutputTokens(20)
                    .temperature(1.0F)
                    .build();

    GenerateContentResponse response =
            client.models.generateContent(
                    "gemini-3.6-flash",
                    "Tell me a story about a magic backpack.",
                    config);

    System.out.println(response.text());

### Safety Settings

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()
    unsafe_prompt = (
        "I support Martians Soccer Club and I think Jupiterians Football Club sucks! "
        "Write a ironic phrase about them including expletives."
    )
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=unsafe_prompt,
        config=types.GenerateContentConfig(
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH",
                    threshold="BLOCK_MEDIUM_AND_ABOVE",
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_ONLY_HIGH"
                ),
            ]
        ),
    )
    try:
        print(response.text)
    except Exception:
        print("No information generated by the model.")

    print(response.candidates[0].safety_ratings)

### Node.js

      // Make sure to include the following import:
      // import {GoogleGenAI} from '@google/genai';
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const unsafePrompt =
        "I support Martians Soccer Club and I think Jupiterians Football Club sucks! Write a ironic phrase about them including expletives.";

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: unsafePrompt,
        config: {
          safetySettings: [
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH",
            },
          ],
        },
      });

      try {
        console.log("Generated text:", response.text);
      } catch (error) {
        console.log("No information generated by the model.");
      }
      console.log("Safety ratings:", response.candidates[0].safetyRatings);
      return response;
    }

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    unsafePrompt := "I support Martians Soccer Club and I think Jupiterians Football Club sucks! " +
    	"Write a ironic phrase about them including expletives."

    config := &genai.GenerateContentConfig{
    	SafetySettings: []*genai.SafetySetting{
    		{
    			Category:  "HARM_CATEGORY_HATE_SPEECH",
    			Threshold: "BLOCK_MEDIUM_AND_ABOVE",
    		},
    		{
    			Category:  "HARM_CATEGORY_HARASSMENT",
    			Threshold: "BLOCK_ONLY_HIGH",
    		},
    	},
    }
    contents := []*genai.Content{
    	genai.NewContentFromText(unsafePrompt, genai.RoleUser),
    }
    response, err := client.Models.GenerateContent(ctx, "gemini-3.6-flash", contents, config)
    if err != nil {
    	log.Fatal(err)
    }

    // Print the generated text.
    text := response.Text()
    fmt.Println("Generated text:", text)

    // Print the and safety ratings from the first candidate.
    if len(response.Candidates) > 0 {
    	fmt.Println("Finish reason:", response.Candidates[0].FinishReason)
    	safetyRatings, err := json.MarshalIndent(response.Candidates[0].SafetyRatings, "", "  ")
    	if err != nil {
    		return err
    	}
    	fmt.Println("Safety ratings:", string(safetyRatings))
    } else {
    	fmt.Println("No candidate returned.")
    }

### Shell

    echo '{
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
        ],
        "contents": [{
            "parts":[{
                "text": "'I support Martians Soccer Club and I think Jupiterians Football Club sucks! Write a ironic phrase about them.'"}]}]}' > request.json

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d @request.json 2> /dev/null

### Java

    Client client = new Client();

    String unsafePrompt = """
             I support Martians Soccer Club and I think Jupiterians Football Club sucks!
             Write a ironic phrase about them including expletives.
            """;

    GenerateContentConfig config =
            GenerateContentConfig.builder()
                    .safetySettings(Arrays.asList(
                            SafetySetting.builder()
                                    .category("HARM_CATEGORY_HATE_SPEECH")
                                    .threshold("BLOCK_MEDIUM_AND_ABOVE")
                                    .build(),
                            SafetySetting.builder()
                                    .category("HARM_CATEGORY_HARASSMENT")
                                    .threshold("BLOCK_ONLY_HIGH")
                                    .build()
                    )).build();

    GenerateContentResponse response =
            client.models.generateContent(
                    "gemini-3.6-flash",
                    unsafePrompt,
                    config);

    try {
        System.out.println(response.text());
    } catch (Exception e) {
        System.out.println("No information generated by the model");
    }

    System.out.println(response.candidates().get().getFirst().safetyRatings());

### System Instruction

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents="Good morning! How are you?",
        config=types.GenerateContentConfig(
            system_instruction="You are a cat. Your name is Neko."
        ),
    )
    print(response.text)

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Good morning! How are you?",
      config: {
        systemInstruction: "You are a cat. Your name is Neko.",
      },
    });
    console.log(response.text);

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    // Construct the user message contents.
    contents := []*genai.Content{
    	genai.NewContentFromText("Good morning! How are you?", genai.RoleUser),
    }

    // Set the system instruction as a *genai.Content.
    config := &genai.GenerateContentConfig{
    	SystemInstruction: genai.NewContentFromText("You are a cat. Your name is Neko.", genai.RoleUser),
    }

    response, err := client.Models.GenerateContent(ctx, "gemini-3.6-flash", contents, config)
    if err != nil {
    	log.Fatal(err)
    }
    printResponse(response)

### Shell

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{ "system_instruction": {
        "parts":
          { "text": "You are a cat. Your name is Neko."}},
        "contents": {
          "parts": {
            "text": "Hello there"}}}'

### Java

    Client client = new Client();

    Part textPart = Part.builder().text("You are a cat. Your name is Neko.").build();

    Content content = Content.builder().role("system").parts(ImmutableList.of(textPart)).build();

    GenerateContentConfig config = GenerateContentConfig.builder()
            .systemInstruction(content)
            .build();

    GenerateContentResponse response =
            client.models.generateContent(
                    "gemini-3.6-flash",
                    "Good morning! How are you?",
                    config);

    System.out.println(response.text());

### Response body

If successful, the response body contains an instance of `https://ai.google.dev/api/generate-content#v1beta.GenerateContentResponse`.

## Method: models.streamGenerateContent

- [Endpoint](https://ai.google.dev/api/generate-content#body.HTTP_TEMPLATE)
- [Path parameters](https://ai.google.dev/api/generate-content#body.PATH_PARAMETERS)
- [Request body](https://ai.google.dev/api/generate-content#body.request_body)
  - [JSON representation](https://ai.google.dev/api/generate-content#body.request_body.SCHEMA_REPRESENTATION)
- [Response body](https://ai.google.dev/api/generate-content#body.response_body)
- [Authorization scopes](https://ai.google.dev/api/generate-content#body.aspect)
- [Example request](https://ai.google.dev/api/generate-content#body.codeSnippets)
  - [Text](https://ai.google.dev/api/generate-content#body.codeSnippets.group)
  - [Image](https://ai.google.dev/api/generate-content#body.codeSnippets.group_1)
  - [Audio](https://ai.google.dev/api/generate-content#body.codeSnippets.group_2)
  - [Video](https://ai.google.dev/api/generate-content#body.codeSnippets.group_3)
  - [PDF](https://ai.google.dev/api/generate-content#body.codeSnippets.group_4)
  - [Chat](https://ai.google.dev/api/generate-content#body.codeSnippets.group_5)

Generates a [streamed response](https://ai.google.dev/gemini-api/docs/text-generation?lang=python#generate-a-text-stream) from the model given an input `GenerateContentRequest`.

### Endpoint

post `https://generativelanguage.googleapis.com/v1beta/{model=models/*}:streamGenerateContent`   

### Path parameters

`model` `string` Required. The name of the `Model` to use for generating the completion.

Format: `models/{model}`. It takes the form `models/{model}`.

### Request body

The request body contains data with the following structure:
Fields `contents[]` ``object (`Content`)`` Required. The content of the current conversation with the model.

For single-turn queries, this is a single instance. For multi-turn queries like [chat](https://ai.google.dev/gemini-api/docs/text-generation#chat), this is a repeated field that contains the conversation history and the latest request.
`tools[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.Tool`)`` Optional. A list of `Tools` the `Model` may use to generate the next response.

A `Tool` is a piece of code that enables the system to interact with external systems to perform an action, or set of actions, outside of knowledge and scope of the `Model`. Supported `Tool`s are `Function` and `codeExecution`. Refer to the [Function calling](https://ai.google.dev/gemini-api/docs/function-calling) and the [Code execution](https://ai.google.dev/gemini-api/docs/code-execution) guides to learn more.
`toolConfig` ``object (`https://ai.google.dev/api/caching#ToolConfig`)`` Optional. Tool configuration for any `Tool` specified in the request. Refer to the [Function calling guide](https://ai.google.dev/gemini-api/docs/function-calling#function_calling_mode) for a usage example.
`safetySettings[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.SafetySetting`)`` Optional. A list of unique `SafetySetting` instances for blocking unsafe content.

This will be enforced on the `GenerateContentRequest.contents` and `GenerateContentResponse.candidates`. There should not be more than one setting for each `SafetyCategory` type. The API will block any contents and responses that fail to meet the thresholds set by these settings. This list overrides the default settings for each `SafetyCategory` specified in the safetySettings. If there is no `SafetySetting` for a given `SafetyCategory` provided in the list, the API will use the default safety setting for that category. Harm categories HARM_CATEGORY_HATE_SPEECH, HARM_CATEGORY_SEXUALLY_EXPLICIT, HARM_CATEGORY_DANGEROUS_CONTENT, HARM_CATEGORY_HARASSMENT, HARM_CATEGORY_CIVIC_INTEGRITY, HARM_CATEGORY_JAILBREAK are supported. Refer to the [guide](https://ai.google.dev/gemini-api/docs/safety-settings) for detailed information on available safety settings. Also refer to the [Safety guidance](https://ai.google.dev/gemini-api/docs/safety-guidance) to learn how to incorporate safety considerations in your AI applications.
`systemInstruction` ``object (`Content`)`` Optional. Developer set [system instruction(s)](https://ai.google.dev/gemini-api/docs/system-instructions). Currently, text only.
`generationConfig` ``object (`https://ai.google.dev/api/generate-content#GenerationConfig`)`` Optional. Configuration options for model generation and outputs.
`cachedContent` `string` Optional. The name of the content [cached](https://ai.google.dev/gemini-api/docs/caching) to use as context to serve the prediction. Format: `cachedContents/{cachedContent}`
`serviceTier` ``enum (`ServiceTier`)`` Optional. The service tier of the request.
`store` `boolean` Optional. Configures the logging behavior for a given request. If set, it takes precedence over the project-level logging config.

### Example request

### Text

### Python

    from google import genai

    client = genai.Client()
    response = client.models.generate_content_stream(
        model="gemini-3.6-flash", contents="Write a story about a magic backpack."
    )
    for chunk in response:
        print(chunk.text)
        print("_" * 80)

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContentStream({
      model: "gemini-3.6-flash",
      contents: "Write a story about a magic backpack.",
    });
    let text = "";
    for await (const chunk of response) {
      console.log(chunk.text);
      text += chunk.text;
    }

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }
    contents := []*genai.Content{
    	genai.NewContentFromText("Write a story about a magic backpack.", genai.RoleUser),
    }
    for response, err := range client.Models.GenerateContentStream(
    	ctx,
    	"gemini-3.6-flash",
    	contents,
    	nil,
    ) {
    	if err != nil {
    		log.Fatal(err)
    	}
    	fmt.Print(response.Candidates[0].Content.Parts[0].Text)
    }

### Shell

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}" \
            -H 'Content-Type: application/json' \
            --no-buffer \
            -d '{ "contents":[{"parts":[{"text": "Write a story about a magic backpack."}]}]}'

### Java

    Client client = new Client();

    ResponseStream<GenerateContentResponse> responseStream =
            client.models.generateContentStream(
                    "gemini-3.6-flash",
                    "Write a story about a magic backpack.",
                    null);

    StringBuilder response = new StringBuilder();
    for (GenerateContentResponse res : responseStream) {
        System.out.print(res.text());
        response.append(res.text());
    }

    responseStream.close();

### Image

### Python

    from google import genai
    import PIL.Image

    client = genai.Client()
    organ = PIL.Image.open(media / "organ.jpg")
    response = client.models.generate_content_stream(
        model="gemini-3.6-flash", contents=["Tell me about this instrument", organ]
    )
    for chunk in response:
        print(chunk.text)
        print("_" * 80)

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const organ = await ai.files.upload({
      file: path.join(media, "organ.jpg"),
    });

    const response = await ai.models.generateContentStream({
      model: "gemini-3.6-flash",
      contents: [
        createUserContent([
          "Tell me about this instrument", 
          createPartFromUri(organ.uri, organ.mimeType)
        ]),
      ],
    });
    let text = "";
    for await (const chunk of response) {
      console.log(chunk.text);
      text += chunk.text;
    }

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }
    file, err := client.Files.UploadFromPath(
    	ctx, 
    	filepath.Join(getMedia(), "organ.jpg"), 
    	&genai.UploadFileConfig{
    		MIMEType : "image/jpeg",
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }
    parts := []*genai.Part{
    	genai.NewPartFromText("Tell me about this instrument"),
    	genai.NewPartFromURI(file.URI, file.MIMEType),
    }
    contents := []*genai.Content{
    	genai.NewContentFromParts(parts, genai.RoleUser),
    }
    for response, err := range client.Models.GenerateContentStream(
    	ctx,
    	"gemini-3.6-flash",
    	contents,
    	nil,
    ) {
    	if err != nil {
    		log.Fatal(err)
    	}
    	fmt.Print(response.Candidates[0].Content.Parts[0].Text)
    }

### Shell

    cat > "$TEMP_JSON" << EOF
    {
      "contents": [{
        "parts":[
          {"text": "Tell me about this instrument"},
          {
            "inline_data": {
              "mime_type":"image/jpeg",
              "data": "$(cat "$TEMP_B64")"
            }
          }
        ]
      }]
    }
    EOF

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=$GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d "@$TEMP_JSON" 2> /dev/null

### Java

    Client client = new Client();

    String path = media_path + "organ.jpg";
    byte[] imageData = Files.readAllBytes(Paths.get(path));

    Content content =
            Content.fromParts(
                    Part.fromText("Tell me about this instrument."),
                    Part.fromBytes(imageData, "image/jpeg"));


    ResponseStream<GenerateContentResponse> responseStream =
            client.models.generateContentStream(
                    "gemini-3.6-flash",
                    content,
                    null);

    StringBuilder response = new StringBuilder();
    for (GenerateContentResponse res : responseStream) {
        System.out.print(res.text());
        response.append(res.text());
    }

    responseStream.close();

### Audio

### Python

    from google import genai

    client = genai.Client()
    sample_audio = client.files.upload(file=media / "sample.mp3")
    response = client.models.generate_content_stream(
        model="gemini-3.6-flash",
        contents=["Give me a summary of this audio file.", sample_audio],
    )
    for chunk in response:
        print(chunk.text)
        print("_" * 80)

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    file, err := client.Files.UploadFromPath(
    	ctx, 
    	filepath.Join(getMedia(), "sample.mp3"), 
    	&genai.UploadFileConfig{
    		MIMEType : "audio/mpeg",
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }

    parts := []*genai.Part{
    	genai.NewPartFromText("Give me a summary of this audio file."),
    	genai.NewPartFromURI(file.URI, file.MIMEType),
    }

    contents := []*genai.Content{
    	genai.NewContentFromParts(parts, genai.RoleUser),
    }

    for result, err := range client.Models.GenerateContentStream(
    	ctx,
    	"gemini-3.6-flash",
    	contents,
    	nil,
    ) {
    	if err != nil {
    		log.Fatal(err)
    	}
    	fmt.Print(result.Candidates[0].Content.Parts[0].Text)
    }

### Shell

    # Use File API to upload audio data to API request.
    MIME_TYPE=$(file -b --mime-type "${AUDIO_PATH}")
    NUM_BYTES=$(wc -c < "${AUDIO_PATH}")
    DISPLAY_NAME=AUDIO

    tmp_header_file=upload-header.tmp

    # Initial resumable request defining metadata.
    # The upload url is in the response headers dump them to a file.
    curl "${BASE_URL}/upload/v1beta/files?key=${GEMINI_API_KEY}" \
      -D upload-header.tmp \
      -H "X-Goog-Upload-Protocol: resumable" \
      -H "X-Goog-Upload-Command: start" \
      -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Header-Content-Type: ${MIME_TYPE}" \
      -H "Content-Type: application/json" \
      -d "{'file': {'display_name': '${DISPLAY_NAME}'}}" 2> /dev/null

    upload_url=$(grep -i "x-goog-upload-url: " "${tmp_header_file}" | cut -d" " -f2 | tr -d "\r")
    rm "${tmp_header_file}"

    # Upload the actual bytes.
    curl "${upload_url}" \
      -H "Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Offset: 0" \
      -H "X-Goog-Upload-Command: upload, finalize" \
      --data-binary "@${AUDIO_PATH}" 2> /dev/null > file_info.json

    file_uri=$(jq ".file.uri" file_info.json)
    echo file_uri=$file_uri

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=$GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d '{
          "contents": [{
            "parts":[
              {"text": "Please describe this file."},
              {"file_data":{"mime_type": "audio/mpeg", "file_uri": '$file_uri'}}]
            }]
           }' 2> /dev/null > response.json

    cat response.json
    echo

### Video

### Python

    from google import genai
    import time

    client = genai.Client()
    # Video clip (CC BY 3.0) from https://peach.blender.org/download/
    myfile = client.files.upload(file=media / "Big_Buck_Bunny.mp4")
    print(f"{myfile=}")

    # Poll until the video file is completely processed (state becomes ACTIVE).
    while not myfile.state or myfile.state.name != "ACTIVE":
        print("Processing video...")
        print("File state:", myfile.state)
        time.sleep(5)
        myfile = client.files.get(name=myfile.name)

    response = client.models.generate_content_stream(
        model="gemini-3.6-flash", contents=[myfile, "Describe this video clip"]
    )
    for chunk in response:
        print(chunk.text)
        print("_" * 80)

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let video = await ai.files.upload({
      file: path.join(media, 'Big_Buck_Bunny.mp4'),
    });

    // Poll until the video file is completely processed (state becomes ACTIVE).
    while (!video.state || video.state.toString() !== 'ACTIVE') {
      console.log('Processing video...');
      console.log('File state: ', video.state);
      await sleep(5000);
      video = await ai.files.get({name: video.name});
    }

    const response = await ai.models.generateContentStream({
      model: "gemini-3.6-flash",
      contents: [
        createUserContent([
          "Describe this video clip",
          createPartFromUri(video.uri, video.mimeType),
        ]),
      ],
    });
    let text = "";
    for await (const chunk of response) {
      console.log(chunk.text);
      text += chunk.text;
    }

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    file, err := client.Files.UploadFromPath(
    	ctx, 
    	filepath.Join(getMedia(), "Big_Buck_Bunny.mp4"), 
    	&genai.UploadFileConfig{
    		MIMEType : "video/mp4",
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }

    // Poll until the video file is completely processed (state becomes ACTIVE).
    for file.State == genai.FileStateUnspecified || file.State != genai.FileStateActive {
    	fmt.Println("Processing video...")
    	fmt.Println("File state:", file.State)
    	time.Sleep(5 * time.Second)

    	file, err = client.Files.Get(ctx, file.Name, nil)
    	if err != nil {
    		log.Fatal(err)
    	}
    }

    parts := []*genai.Part{
    	genai.NewPartFromText("Describe this video clip"),
    	genai.NewPartFromURI(file.URI, file.MIMEType),
    }

    contents := []*genai.Content{
    	genai.NewContentFromParts(parts, genai.RoleUser),
    }

    for result, err := range client.Models.GenerateContentStream(
    	ctx,
    	"gemini-3.6-flash",
    	contents,
    	nil,
    ) {
    	if err != nil {
    		log.Fatal(err)
    	}
    	fmt.Print(result.Candidates[0].Content.Parts[0].Text)
    }

### Shell

    # Use File API to upload audio data to API request.
    MIME_TYPE=$(file -b --mime-type "${VIDEO_PATH}")
    NUM_BYTES=$(wc -c < "${VIDEO_PATH}")
    DISPLAY_NAME=VIDEO_PATH

    # Initial resumable request defining metadata.
    # The upload url is in the response headers dump them to a file.
    curl "${BASE_URL}/upload/v1beta/files?key=${GEMINI_API_KEY}" \
      -D upload-header.tmp \
      -H "X-Goog-Upload-Protocol: resumable" \
      -H "X-Goog-Upload-Command: start" \
      -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Header-Content-Type: ${MIME_TYPE}" \
      -H "Content-Type: application/json" \
      -d "{'file': {'display_name': '${DISPLAY_NAME}'}}" 2> /dev/null

    upload_url=$(grep -i "x-goog-upload-url: " "${tmp_header_file}" | cut -d" " -f2 | tr -d "\r")
    rm "${tmp_header_file}"

    # Upload the actual bytes.
    curl "${upload_url}" \
      -H "Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Offset: 0" \
      -H "X-Goog-Upload-Command: upload, finalize" \
      --data-binary "@${VIDEO_PATH}" 2> /dev/null > file_info.json

    file_uri=$(jq ".file.uri" file_info.json)
    echo file_uri=$file_uri

    state=$(jq ".file.state" file_info.json)
    echo state=$state

    while [[ "($state)" = *"PROCESSING"* ]];
    do
      echo "Processing video..."
      sleep 5
      # Get the file of interest to check state
      curl https://generativelanguage.googleapis.com/v1beta/files/$name > file_info.json
      state=$(jq ".file.state" file_info.json)
    done

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=$GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d '{
          "contents": [{
            "parts":[
              {"text": "Please describe this file."},
              {"file_data":{"mime_type": "video/mp4", "file_uri": '$file_uri'}}]
            }]
           }' 2> /dev/null > response.json

    cat response.json
    echo

### PDF

### Python

    from google import genai

    client = genai.Client()
    sample_pdf = client.files.upload(file=media / "test.pdf")
    response = client.models.generate_content_stream(
        model="gemini-3.6-flash",
        contents=["Give me a summary of this document:", sample_pdf],
    )

    for chunk in response:
        print(chunk.text)
        print("_" * 80)

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    file, err := client.Files.UploadFromPath(
    	ctx, 
    	filepath.Join(getMedia(), "test.pdf"), 
    	&genai.UploadFileConfig{
    		MIMEType : "application/pdf",
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }

    parts := []*genai.Part{
    	genai.NewPartFromText("Give me a summary of this document:"),
    	genai.NewPartFromURI(file.URI, file.MIMEType),
    }

    contents := []*genai.Content{
    	genai.NewContentFromParts(parts, genai.RoleUser),
    }

    for result, err := range client.Models.GenerateContentStream(
    	ctx,
    	"gemini-3.6-flash",
    	contents,
    	nil,
    ) {
    	if err != nil {
    		log.Fatal(err)
    	}
    	fmt.Print(result.Candidates[0].Content.Parts[0].Text)
    }

### Shell

    MIME_TYPE=$(file -b --mime-type "${PDF_PATH}")
    NUM_BYTES=$(wc -c < "${PDF_PATH}")
    DISPLAY_NAME=TEXT


    echo $MIME_TYPE
    tmp_header_file=upload-header.tmp

    # Initial resumable request defining metadata.
    # The upload url is in the response headers dump them to a file.
    curl "${BASE_URL}/upload/v1beta/files?key=${GEMINI_API_KEY}" \
      -D upload-header.tmp \
      -H "X-Goog-Upload-Protocol: resumable" \
      -H "X-Goog-Upload-Command: start" \
      -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Header-Content-Type: ${MIME_TYPE}" \
      -H "Content-Type: application/json" \
      -d "{'file': {'display_name': '${DISPLAY_NAME}'}}" 2> /dev/null

    upload_url=$(grep -i "x-goog-upload-url: " "${tmp_header_file}" | cut -d" " -f2 | tr -d "\r")
    rm "${tmp_header_file}"

    # Upload the actual bytes.
    curl "${upload_url}" \
      -H "Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Offset: 0" \
      -H "X-Goog-Upload-Command: upload, finalize" \
      --data-binary "@${PDF_PATH}" 2> /dev/null > file_info.json

    file_uri=$(jq ".file.uri" file_info.json)
    echo file_uri=$file_uri

    # Now generate content using that file
    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=$GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d '{
          "contents": [{
            "parts":[
              {"text": "Can you add a few more lines to this poem?"},
              {"file_data":{"mime_type": "application/pdf", "file_uri": '$file_uri'}}]
            }]
           }' 2> /dev/null > response.json

    cat response.json
    echo

### Chat

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()
    chat = client.chats.create(
        model="gemini-3.6-flash",
        history=[
            types.Content(role="user", parts=[types.Part(text="Hello")]),
            types.Content(
                role="model",
                parts=[
                    types.Part(
                        text="Great to meet you. What would you like to know?"
                    )
                ],
            ),
        ],
    )
    response = chat.send_message_stream(message="I have 2 dogs in my house.")
    for chunk in response:
        print(chunk.text)
        print("_" * 80)
    response = chat.send_message_stream(message="How many paws are in my house?")
    for chunk in response:
        print(chunk.text)
        print("_" * 80)

    print(chat.get_history())

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const chat = ai.chats.create({
      model: "gemini-3.6-flash",
      history: [
        {
          role: "user",
          parts: [{ text: "Hello" }],
        },
        {
          role: "model",
          parts: [{ text: "Great to meet you. What would you like to know?" }],
        },
      ],
    });

    console.log("Streaming response for first message:");
    const stream1 = await chat.sendMessageStream({
      message: "I have 2 dogs in my house.",
    });
    for await (const chunk of stream1) {
      console.log(chunk.text);
      console.log("_".repeat(80));
    }

    console.log("Streaming response for second message:");
    const stream2 = await chat.sendMessageStream({
      message: "How many paws are in my house?",
    });
    for await (const chunk of stream2) {
      console.log(chunk.text);
      console.log("_".repeat(80));
    }

    console.log(chat.getHistory());

### Go

    ctx := context.Background()
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
    	APIKey:  os.Getenv("GEMINI_API_KEY"),
    	Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
    	log.Fatal(err)
    }

    history := []*genai.Content{
    	genai.NewContentFromText("Hello", genai.RoleUser),
    	genai.NewContentFromText("Great to meet you. What would you like to know?", genai.RoleModel),
    }
    chat, err := client.Chats.Create(ctx, "gemini-3.6-flash", nil, history)
    if err != nil {
    	log.Fatal(err)
    }

    for chunk, err := range chat.SendMessageStream(ctx, genai.Part{Text: "I have 2 dogs in my house."}) {
    	if err != nil {
    		log.Fatal(err)
    	}
    	fmt.Println(chunk.Text())
    	fmt.Println(strings.Repeat("_", 64))
    }

    for chunk, err := range chat.SendMessageStream(ctx, genai.Part{Text: "How many paws are in my house?"}) {
    	if err != nil {
    		log.Fatal(err)
    	}
    	fmt.Println(chunk.Text())
    	fmt.Println(strings.Repeat("_", 64))
    }

    fmt.Println(chat.History(false))

### Shell

    curl https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=$GEMINI_API_KEY \
        -H 'Content-Type: application/json' \
        -X POST \
        -d '{
          "contents": [
            {"role":"user",
             "parts":[{
               "text": "Hello"}]},
            {"role": "model",
             "parts":[{
               "text": "Great to meet you. What would you like to know?"}]},
            {"role":"user",
             "parts":[{
               "text": "I have two dogs in my house. How many paws are in my house?"}]},
          ]
        }' 2> /dev/null | grep "text"

### Response body

If successful, the response body contains a stream of `https://ai.google.dev/api/generate-content#v1beta.GenerateContentResponse` instances.

## GenerateContentResponse

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [PromptFeedback](https://ai.google.dev/api/generate-content#PromptFeedback)
  - [JSON representation](https://ai.google.dev/api/generate-content#PromptFeedback.SCHEMA_REPRESENTATION)
- [BlockReason](https://ai.google.dev/api/generate-content#BlockReason)
- [UsageMetadata](https://ai.google.dev/api/generate-content#UsageMetadata)
  - [JSON representation](https://ai.google.dev/api/generate-content#UsageMetadata.SCHEMA_REPRESENTATION)
- [ModelStatus](https://ai.google.dev/api/generate-content#ModelStatus)
  - [JSON representation](https://ai.google.dev/api/generate-content#ModelStatus.SCHEMA_REPRESENTATION)
- [ModelStage](https://ai.google.dev/api/generate-content#ModelStage)

Response from the model supporting multiple candidate responses.

Safety ratings and content filtering are reported for both prompt in `GenerateContentResponse.prompt_feedback` and for each candidate in `finishReason` and in `safetyRatings`. The API: - Returns either all requested candidates or none of them - Returns no candidates at all only if there was something wrong with the prompt (check `promptFeedback`) - Reports feedback on each candidate in `finishReason` and `safetyRatings`.
Fields `candidates[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.Candidate`)`` Candidate responses from the model.
`promptFeedback` ``object (`https://ai.google.dev/api/generate-content#PromptFeedback`)`` Returns the prompt's feedback related to the content filters.
`usageMetadata` ``object (`https://ai.google.dev/api/generate-content#UsageMetadata`)`` Output only. Metadata on the generation requests' token usage.
`modelVersion` `string` Output only. The model version used to generate the response.
`responseId` `string` Output only. responseId is used to identify each response.
`modelStatus` ``object (`https://ai.google.dev/api/generate-content#ModelStatus`)`` Output only. The current model status of this model.

| JSON representation |
|---|
| ``` { "candidates": [ { object (`https://ai.google.dev/api/generate-content#v1beta.Candidate`) } ], "promptFeedback": { object (`https://ai.google.dev/api/generate-content#PromptFeedback`) }, "usageMetadata": { object (`https://ai.google.dev/api/generate-content#UsageMetadata`) }, "modelVersion": string, "responseId": string, "modelStatus": { object (`https://ai.google.dev/api/generate-content#ModelStatus`) } } ``` |

## PromptFeedback

A set of the feedback metadata the prompt specified in `GenerateContentRequest.content`.
Fields `blockReason` ``enum (`https://ai.google.dev/api/generate-content#BlockReason`)`` Optional. If set, the prompt was blocked and no candidates are returned. Rephrase the prompt.
`safetyRatings[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.SafetyRating`)`` Ratings for safety of the prompt. There is at most one rating per category.

| JSON representation |
|---|
| ``` { "blockReason": enum (`https://ai.google.dev/api/generate-content#BlockReason`), "safetyRatings": [ { object (`https://ai.google.dev/api/generate-content#v1beta.SafetyRating`) } ] } ``` |

## BlockReason

Specifies the reason why the prompt was blocked.

| Enums ||
|---|---|
| `BLOCK_REASON_UNSPECIFIED` | Default value. This value is unused. |
| `SAFETY` | Prompt was blocked due to safety reasons. Inspect `safetyRatings` to understand which safety category blocked it. |
| `OTHER` | Prompt was blocked due to unknown reasons. |
| `BLOCKLIST` | Prompt was blocked due to the terms which are included from the terminology blocklist. |
| `PROHIBITED_CONTENT` | Prompt was blocked due to prohibited content. |
| `IMAGE_SAFETY` | Candidates blocked due to unsafe image generation content. |

## UsageMetadata

Metadata on the generation request's token usage.
Fields `promptTokenCount` `integer` Number of tokens in the prompt. When `cachedContent` is set, this is still the total effective prompt size meaning this includes the number of tokens in the cached content.
`cachedContentTokenCount` `integer` Number of tokens in the cached part of the prompt (the cached content)
`candidatesTokenCount` `integer` Total number of tokens across all the generated response candidates.
`toolUsePromptTokenCount` `integer` Output only. Number of tokens present in tool-use prompt(s).
`thoughtsTokenCount` `integer` Output only. Number of tokens of thoughts for thinking models.
`totalTokenCount` `integer` Total token count for the generation request (prompt + thoughts + response candidates).
`promptTokensDetails[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.ModalityTokenCount`)`` Output only. List of modalities that were processed in the request input.
`cacheTokensDetails[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.ModalityTokenCount`)`` Output only. List of modalities of the cached content in the request input.
`candidatesTokensDetails[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.ModalityTokenCount`)`` Output only. List of modalities that were returned in the response.
`toolUsePromptTokensDetails[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.ModalityTokenCount`)`` Output only. List of modalities that were processed for tool-use request inputs.
`serviceTier` ``enum (`ServiceTier`)`` Output only. Service tier of the request.

| JSON representation |
|---|
| ``` { "promptTokenCount": integer, "cachedContentTokenCount": integer, "candidatesTokenCount": integer, "toolUsePromptTokenCount": integer, "thoughtsTokenCount": integer, "totalTokenCount": integer, "promptTokensDetails": [ { object (`https://ai.google.dev/api/generate-content#v1beta.ModalityTokenCount`) } ], "cacheTokensDetails": [ { object (`https://ai.google.dev/api/generate-content#v1beta.ModalityTokenCount`) } ], "candidatesTokensDetails": [ { object (`https://ai.google.dev/api/generate-content#v1beta.ModalityTokenCount`) } ], "toolUsePromptTokensDetails": [ { object (`https://ai.google.dev/api/generate-content#v1beta.ModalityTokenCount`) } ], "serviceTier": enum (`ServiceTier`) } ``` |

## ModelStatus

The status of the underlying model. This is used to indicate the stage of the underlying model and the retirement time if applicable.
Fields `modelStage` ``enum (`https://ai.google.dev/api/generate-content#ModelStage`)`` The stage of the underlying model.
`retirementTime` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#timestamp` format)`` The time at which the model will be retired.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: `"2014-10-02T15:01:23Z"`, `"2014-10-02T15:01:23.045123456Z"` or `"2014-10-02T15:01:23+05:30"`.
`message` `string` A message explaining the model status.

| JSON representation |
|---|
| ``` { "modelStage": enum (`https://ai.google.dev/api/generate-content#ModelStage`), "retirementTime": string, "message": string } ``` |

## ModelStage

Defines the stage of the underlying model.

| Enums ||
|---|---|
| `MODEL_STAGE_UNSPECIFIED` | Unspecified model stage. |
| `UNSTABLE_EXPERIMENTAL` | The underlying model is subject to lots of tunings. > [!WARNING] > This item is deprecated! |
| `EXPERIMENTAL` | Models in this stage are for experimental purposes only. |
| `PREVIEW` | Models in this stage are more mature than experimental models. |
| `STABLE` | Models in this stage are considered stable and ready for production use. |
| `LEGACY` | If the model is on this stage, it means that this model is on the path to deprecation in near future. Only existing customers can use this model. |
| `DEPRECATED` | Models in this stage are deprecated. These models cannot be used. > [!WARNING] > This item is deprecated! |
| `RETIRED` | Models in this stage are retired. These models cannot be used. |

## Candidate

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [FinishReason](https://ai.google.dev/api/generate-content#FinishReason)
- [GroundingAttribution](https://ai.google.dev/api/generate-content#GroundingAttribution)
  - [JSON representation](https://ai.google.dev/api/generate-content#GroundingAttribution.SCHEMA_REPRESENTATION)
- [AttributionSourceId](https://ai.google.dev/api/generate-content#AttributionSourceId)
  - [JSON representation](https://ai.google.dev/api/generate-content#AttributionSourceId.SCHEMA_REPRESENTATION)
- [GroundingPassageId](https://ai.google.dev/api/generate-content#GroundingPassageId)
  - [JSON representation](https://ai.google.dev/api/generate-content#GroundingPassageId.SCHEMA_REPRESENTATION)
- [SemanticRetrieverChunk](https://ai.google.dev/api/generate-content#SemanticRetrieverChunk)
  - [JSON representation](https://ai.google.dev/api/generate-content#SemanticRetrieverChunk.SCHEMA_REPRESENTATION)
- [GroundingMetadata](https://ai.google.dev/api/generate-content#GroundingMetadata)
  - [JSON representation](https://ai.google.dev/api/generate-content#GroundingMetadata.SCHEMA_REPRESENTATION)
- [SearchEntryPoint](https://ai.google.dev/api/generate-content#SearchEntryPoint)
  - [JSON representation](https://ai.google.dev/api/generate-content#SearchEntryPoint.SCHEMA_REPRESENTATION)
- [GroundingChunk](https://ai.google.dev/api/generate-content#GroundingChunk)
  - [JSON representation](https://ai.google.dev/api/generate-content#GroundingChunk.SCHEMA_REPRESENTATION)
- [Web](https://ai.google.dev/api/generate-content#Web)
  - [JSON representation](https://ai.google.dev/api/generate-content#Web.SCHEMA_REPRESENTATION)
- [Image](https://ai.google.dev/api/generate-content#Image)
  - [JSON representation](https://ai.google.dev/api/generate-content#Image.SCHEMA_REPRESENTATION)
- [RetrievedContext](https://ai.google.dev/api/generate-content#RetrievedContext)
  - [JSON representation](https://ai.google.dev/api/generate-content#RetrievedContext.SCHEMA_REPRESENTATION)
- [CustomMetadata](https://ai.google.dev/api/generate-content#CustomMetadata)
  - [JSON representation](https://ai.google.dev/api/generate-content#CustomMetadata.SCHEMA_REPRESENTATION)
- [StringList](https://ai.google.dev/api/generate-content#StringList)
  - [JSON representation](https://ai.google.dev/api/generate-content#StringList.SCHEMA_REPRESENTATION)
- [Maps](https://ai.google.dev/api/generate-content#Maps)
  - [JSON representation](https://ai.google.dev/api/generate-content#Maps.SCHEMA_REPRESENTATION)
- [PlaceAnswerSources](https://ai.google.dev/api/generate-content#PlaceAnswerSources)
  - [JSON representation](https://ai.google.dev/api/generate-content#PlaceAnswerSources.SCHEMA_REPRESENTATION)
- [ReviewSnippet](https://ai.google.dev/api/generate-content#ReviewSnippet)
  - [JSON representation](https://ai.google.dev/api/generate-content#ReviewSnippet.SCHEMA_REPRESENTATION)
- [GroundingSupport](https://ai.google.dev/api/generate-content#GroundingSupport)
  - [JSON representation](https://ai.google.dev/api/generate-content#GroundingSupport.SCHEMA_REPRESENTATION)
- [Segment](https://ai.google.dev/api/generate-content#Segment)
  - [JSON representation](https://ai.google.dev/api/generate-content#Segment.SCHEMA_REPRESENTATION)
- [RetrievalMetadata](https://ai.google.dev/api/generate-content#RetrievalMetadata)
  - [JSON representation](https://ai.google.dev/api/generate-content#RetrievalMetadata.SCHEMA_REPRESENTATION)
- [LogprobsResult](https://ai.google.dev/api/generate-content#LogprobsResult)
  - [JSON representation](https://ai.google.dev/api/generate-content#LogprobsResult.SCHEMA_REPRESENTATION)
- [TopCandidates](https://ai.google.dev/api/generate-content#TopCandidates)
  - [JSON representation](https://ai.google.dev/api/generate-content#TopCandidates.SCHEMA_REPRESENTATION)
- [Candidate](https://ai.google.dev/api/generate-content#Candidate)
  - [JSON representation](https://ai.google.dev/api/generate-content#Candidate.SCHEMA_REPRESENTATION)
- [UrlContextMetadata](https://ai.google.dev/api/generate-content#UrlContextMetadata)
  - [JSON representation](https://ai.google.dev/api/generate-content#UrlContextMetadata.SCHEMA_REPRESENTATION)
- [UrlMetadata](https://ai.google.dev/api/generate-content#UrlMetadata)
  - [JSON representation](https://ai.google.dev/api/generate-content#UrlMetadata.SCHEMA_REPRESENTATION)
- [UrlRetrievalStatus](https://ai.google.dev/api/generate-content#UrlRetrievalStatus)

A response candidate generated from the model.
Fields `content` ``object (`Content`)`` Output only. Generated content returned from the model.
`finishReason` ``enum (`https://ai.google.dev/api/generate-content#FinishReason`)`` Optional. Output only. The reason why the model stopped generating tokens.

If empty, the model has not stopped generating tokens.
`safetyRatings[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.SafetyRating`)`` List of ratings for the safety of a response candidate.

There is at most one rating per category.
`citationMetadata` ``object (`https://ai.google.dev/api/generate-content#v1beta.CitationMetadata`)`` Output only. Citation information for model-generated candidate.

This field may be populated with recitation information for any text included in the `content`. These are passages that are "recited" from copyrighted material in the foundational LLM's training data.
`tokenCount` `integer` Output only. Token count for this candidate.
`groundingAttributions[]` ``object (`https://ai.google.dev/api/generate-content#GroundingAttribution`)`` Output only. Attribution information for sources that contributed to a grounded answer.

This field is populated for `GenerateAnswer` calls.
`groundingMetadata` ``object (`https://ai.google.dev/api/generate-content#GroundingMetadata`)`` Output only. Grounding metadata for the candidate.

This field is populated for `GenerateContent` calls.
`avgLogprobs` `number` Output only. Average log probability score of the candidate.
`logprobsResult` ``object (`https://ai.google.dev/api/generate-content#LogprobsResult`)`` Output only. Log-likelihood scores for the response tokens and top tokens
`urlContextMetadata` ``object (`https://ai.google.dev/api/generate-content#UrlContextMetadata`)`` Output only. Metadata related to url context retrieval tool.
`index` `integer` Output only. Index of the candidate in the list of response candidates.
`finishMessage` `string` Optional. Output only. Details the reason why the model stopped generating tokens. This is populated only when `finishReason` is set.

| JSON representation |
|---|
| ``` { "content": { object (`Content`) }, "finishReason": enum (`https://ai.google.dev/api/generate-content#FinishReason`), "safetyRatings": [ { object (`https://ai.google.dev/api/generate-content#v1beta.SafetyRating`) } ], "citationMetadata": { object (`https://ai.google.dev/api/generate-content#v1beta.CitationMetadata`) }, "tokenCount": integer, "groundingAttributions": [ { object (`https://ai.google.dev/api/generate-content#GroundingAttribution`) } ], "groundingMetadata": { object (`https://ai.google.dev/api/generate-content#GroundingMetadata`) }, "avgLogprobs": number, "logprobsResult": { object (`https://ai.google.dev/api/generate-content#LogprobsResult`) }, "urlContextMetadata": { object (`https://ai.google.dev/api/generate-content#UrlContextMetadata`) }, "index": integer, "finishMessage": string } ``` |

## FinishReason

Defines the reason why the model stopped generating tokens.

| Enums ||
|---|---|
| `FINISH_REASON_UNSPECIFIED` | Default value. This value is unused. |
| `STOP` | Natural stop point of the model or provided stop sequence. |
| `MAX_TOKENS` | The maximum number of tokens as specified in the request was reached. |
| `SAFETY` | The response candidate content was flagged for safety reasons. |
| `RECITATION` | The response candidate content was flagged for recitation reasons. |
| `LANGUAGE` | The response candidate content was flagged for using an unsupported language. |
| `OTHER` | Unknown reason. |
| `BLOCKLIST` | Token generation stopped because the content contains forbidden terms. |
| `PROHIBITED_CONTENT` | Token generation stopped for potentially containing prohibited content. |
| `SPII` | Token generation stopped because the content potentially contains Sensitive Personally Identifiable Information (SPII). |
| `MALFORMED_FUNCTION_CALL` | The function call generated by the model is invalid. |
| `IMAGE_SAFETY` | Token generation stopped because generated images contain safety violations. |
| `IMAGE_PROHIBITED_CONTENT` | Image generation stopped because generated images has other prohibited content. |
| `IMAGE_OTHER` | Image generation stopped because of other miscellaneous issue. |
| `NO_IMAGE` | The model was expected to generate an image, but none was generated. |
| `IMAGE_RECITATION` | Image generation stopped due to recitation. |
| `UNEXPECTED_TOOL_CALL` | Model generated a tool call but no tools were enabled in the request. |
| `TOO_MANY_TOOL_CALLS` | Model called too many tools consecutively, thus the system exited execution. |
| `MISSING_THOUGHT_SIGNATURE` | Request has at least one thought signature missing. |
| `MALFORMED_RESPONSE` | Finished due to malformed response. |
| `ESCALATION` | Request was filtered by an escalation rule. |

## GroundingAttribution

Attribution for a source that contributed to an answer.
Fields `sourceId` ``object (`https://ai.google.dev/api/generate-content#AttributionSourceId`)`` Output only. Identifier for the source contributing to this attribution.
`content` ``object (`Content`)`` Grounding source content that makes up this attribution.

| JSON representation |
|---|
| ``` { "sourceId": { object (`https://ai.google.dev/api/generate-content#AttributionSourceId`) }, "content": { object (`Content`) } } ``` |

## AttributionSourceId

Identifier for the source contributing to this attribution.
Fields `source` `Union type` `source` can be only one of the following: `groundingPassage` ``object (`https://ai.google.dev/api/generate-content#GroundingPassageId`)`` Identifier for an inline passage.
`semanticRetrieverChunk` ``object (`https://ai.google.dev/api/generate-content#SemanticRetrieverChunk`)`` Identifier for a `Chunk` fetched via Semantic Retriever.

| JSON representation |
|---|
| ``` { // source "groundingPassage": { object (`https://ai.google.dev/api/generate-content#GroundingPassageId`) }, "semanticRetrieverChunk": { object (`https://ai.google.dev/api/generate-content#SemanticRetrieverChunk`) } // Union type } ``` |

## GroundingPassageId

Identifier for a part within a `GroundingPassage`.
Fields `passageId` `string` Output only. ID of the passage matching the `GenerateAnswerRequest`'s `GroundingPassage.id`.
`partIndex` `integer` Output only. Index of the part within the `GenerateAnswerRequest`'s `GroundingPassage.content`.

| JSON representation |
|---|
| ``` { "passageId": string, "partIndex": integer } ``` |

## SemanticRetrieverChunk

Identifier for a `Chunk` retrieved via Semantic Retriever specified in the `GenerateAnswerRequest` using `SemanticRetrieverConfig`.
Fields `source` `string` Output only. Name of the source matching the request's `SemanticRetrieverConfig.source`. Example: `corpora/123` or `corpora/123/documents/abc`
`chunk` `string` Output only. Name of the `Chunk` containing the attributed text. Example: `corpora/123/documents/abc/chunks/xyz`

| JSON representation |
|---|
| ``` { "source": string, "chunk": string } ``` |

## GroundingMetadata

Metadata returned to client when grounding is enabled.
Fields `groundingChunks[]` ``object (`https://ai.google.dev/api/generate-content#GroundingChunk`)`` List of supporting references retrieved from specified grounding source. When streaming, this only contains the grounding chunks that have not been included in the grounding metadata of previous responses.
`groundingSupports[]` ``object (`https://ai.google.dev/api/generate-content#GroundingSupport`)`` List of grounding support.
`webSearchQueries[]` `string` Web search queries for the following-up web search.
`imageSearchQueries[]` `string` Image search queries used for grounding.
`searchEntryPoint` ``object (`https://ai.google.dev/api/generate-content#SearchEntryPoint`)`` Optional. Google search entry for the following-up web searches.
`retrievalMetadata` ``object (`https://ai.google.dev/api/generate-content#RetrievalMetadata`)`` Metadata related to retrieval in the grounding flow.
`googleMapsWidgetContextToken` `string` Optional. Resource name of the Google Maps widget context token that can be used with the PlacesContextElement widget in order to render contextual data. Only populated in the case that grounding with Google Maps is enabled.

| JSON representation |
|---|
| ``` { "groundingChunks": [ { object (`https://ai.google.dev/api/generate-content#GroundingChunk`) } ], "groundingSupports": [ { object (`https://ai.google.dev/api/generate-content#GroundingSupport`) } ], "webSearchQueries": [ string ], "imageSearchQueries": [ string ], "searchEntryPoint": { object (`https://ai.google.dev/api/generate-content#SearchEntryPoint`) }, "retrievalMetadata": { object (`https://ai.google.dev/api/generate-content#RetrievalMetadata`) }, "googleMapsWidgetContextToken": string } ``` |

## SearchEntryPoint

Google search entry point.
Fields `renderedContent` `string` Optional. Web content snippet that can be embedded in a web page or an app webview.
`sdkBlob` `string (https://developers.google.com/discovery/v1/type-format format)` Optional. Base64 encoded JSON representing array of \<search term, search url\> tuple.

A base64-encoded string.

| JSON representation |
|---|
| ``` { "renderedContent": string, "sdkBlob": string } ``` |

## GroundingChunk

A `GroundingChunk` represents a segment of supporting evidence that grounds the model's response. It can be a chunk from the web, a retrieved context from a file, or information from Google Maps.
Fields `chunk_type` `Union type` Chunk type. `chunk_type` can be only one of the following: `web` ``object (`https://ai.google.dev/api/generate-content#Web`)`` Grounding chunk from the web.
`image` ``object (`https://ai.google.dev/api/generate-content#Image`)`` Optional. Grounding chunk from image search.
`retrievedContext` ``object (`https://ai.google.dev/api/generate-content#RetrievedContext`)`` Optional. Grounding chunk from context retrieved by the file search tool.
`maps` ``object (`https://ai.google.dev/api/generate-content#Maps`)`` Optional. Grounding chunk from Google Maps.

| JSON representation |
|---|
| ``` { // chunk_type "web": { object (`https://ai.google.dev/api/generate-content#Web`) }, "image": { object (`https://ai.google.dev/api/generate-content#Image`) }, "retrievedContext": { object (`https://ai.google.dev/api/generate-content#RetrievedContext`) }, "maps": { object (`https://ai.google.dev/api/generate-content#Maps`) } // Union type } ``` |

## Web

Chunk from the web.
Fields `uri` `string` Output only. URI reference of the chunk.
`title` `string` Output only. Title of the chunk.

| JSON representation |
|---|
| ``` { "uri": string, "title": string } ``` |

## Image

Chunk from image search.
Fields `sourceUri` `string` The web page URI for attribution.
`imageUri` `string` The image asset URL.
`title` `string` The title of the web page that the image is from.
`domain` `string` The root domain of the web page that the image is from, e.g. "example.com".

| JSON representation |
|---|
| ``` { "sourceUri": string, "imageUri": string, "title": string, "domain": string } ``` |

## RetrievedContext

Chunk from context retrieved by the file search tool.
Fields `customMetadata[]` ``object (`https://ai.google.dev/api/generate-content#CustomMetadata`)`` Optional. User-provided metadata about the retrieved context.
`uri` `string` Optional. URI reference of the semantic retrieval document.
`title` `string` Optional. Title of the document.
`text` `string` Optional. Text of the chunk.
`fileSearchStore` `string` Optional. Name of the `FileSearchStore` containing the document. Example: `fileSearchStores/123`
`pageNumber` `integer` Optional. Page number of the retrieved context, if applicable.
`mediaId` `string` Optional. The media blob resource name for multimodal file search results. Format: fileSearchStores/{file_search_store_id}/media/{blobId}

| JSON representation |
|---|
| ``` { "customMetadata": [ { object (`https://ai.google.dev/api/generate-content#CustomMetadata`) } ], "uri": string, "title": string, "text": string, "fileSearchStore": string, "pageNumber": integer, "mediaId": string } ``` |

## CustomMetadata

User provided metadata about the GroundingFact.
Fields `key` `string` The key of the metadata.
`value` `Union type` The value of the metadata. Can be a string, a list of strings, or a number. `value` can be only one of the following: `stringValue` `string` Optional. The string value of the metadata.
`stringListValue` ``object (`https://ai.google.dev/api/generate-content#StringList`)`` Optional. A list of string values for the metadata.
`numericValue` `number` Optional. The numeric value of the metadata. The expected range for this value depends on the specific `key` used.

| JSON representation |
|---|
| ``` { "key": string, // value "stringValue": string, "stringListValue": { object (`https://ai.google.dev/api/generate-content#StringList`) }, "numericValue": number // Union type } ``` |

## StringList

A list of string values.
Fields `values[]` `string` The string values of the list.

| JSON representation |
|---|
| ``` { "values": [ string ] } ``` |

## Maps

A grounding chunk from Google Maps. A Maps chunk corresponds to a single place.
Fields `uri` `string` URI reference of the place.
`title` `string` Title of the place.
`text` `string` Text description of the place answer.
`placeId` `string` The ID of the place, in `places/{placeId}` format. A user can use this ID to look up that place.
`placeAnswerSources` ``object (`https://ai.google.dev/api/generate-content#PlaceAnswerSources`)`` Sources that provide answers about the features of a given place in Google Maps.

| JSON representation |
|---|
| ``` { "uri": string, "title": string, "text": string, "placeId": string, "placeAnswerSources": { object (`https://ai.google.dev/api/generate-content#PlaceAnswerSources`) } } ``` |

## PlaceAnswerSources

Collection of sources that provide answers about the features of a given place in Google Maps. Each PlaceAnswerSources message corresponds to a specific place in Google Maps. The Google Maps tool used these sources in order to answer questions about features of the place (e.g: "does Bar Foo have Wifi" or "is Foo Bar wheelchair accessible?"). Currently we only support review snippets as sources.
Fields `reviewSnippets[]` ``object (`https://ai.google.dev/api/generate-content#ReviewSnippet`)`` Snippets of reviews that are used to generate answers about the features of a given place in Google Maps.

| JSON representation |
|---|
| ``` { "reviewSnippets": [ { object (`https://ai.google.dev/api/generate-content#ReviewSnippet`) } ] } ``` |

## ReviewSnippet

Encapsulates a snippet of a user review that answers a question about the features of a specific place in Google Maps.
Fields `reviewId` `string` The ID of the review snippet.
`googleMapsUri` `string` A link that corresponds to the user review on Google Maps.
`title` `string` Title of the review.

| JSON representation |
|---|
| ``` { "reviewId": string, "googleMapsUri": string, "title": string } ``` |

## GroundingSupport

Grounding support.
Fields `groundingChunkIndices[]` `integer` Optional. A list of indices (into 'grounding_chunk' in `response.candidate.grounding_metadata`) specifying the citations associated with the claim. For instance \[1,3,4\] means that grounding_chunk\[1\], grounding_chunk\[3\], grounding_chunk\[4\] are the retrieved content attributed to the claim. If the response is streaming, the groundingChunkIndices refer to the indices across all responses. It is the client's responsibility to accumulate the grounding chunks from all responses (while maintaining the same order).
`confidenceScores[]` `number` Optional. Confidence score of the support references. Ranges from 0 to 1. 1 is the most confident. This list must have the same size as the groundingChunkIndices.
`renderedParts[]` `integer` Output only. Indices into the `parts` field of the candidate's content. These indices specify which rendered parts are associated with this support source.
`segment` ``object (`https://ai.google.dev/api/generate-content#Segment`)`` Segment of the content this support belongs to.

| JSON representation |
|---|
| ``` { "groundingChunkIndices": [ integer ], "confidenceScores": [ number ], "renderedParts": [ integer ], "segment": { object (`https://ai.google.dev/api/generate-content#Segment`) } } ``` |

## Segment

Segment of the content.
Fields `partIndex` `integer` The index of a Part object within its parent Content object.
`startIndex` `integer` Start index in the given Part, measured in bytes. Offset from the start of the Part, inclusive, starting at zero.
`endIndex` `integer` End index in the given Part, measured in bytes. Offset from the start of the Part, exclusive, starting at zero.
`text` `string` The text corresponding to the segment from the response.

| JSON representation |
|---|
| ``` { "partIndex": integer, "startIndex": integer, "endIndex": integer, "text": string } ``` |

## RetrievalMetadata

Metadata related to retrieval in the grounding flow.
Fields `googleSearchDynamicRetrievalScore` `number` Optional. Score indicating how likely information from google search could help answer the prompt. The score is in the range \[0, 1\], where 0 is the least likely and 1 is the most likely. This score is only populated when google search grounding and dynamic retrieval is enabled. It will be compared to the threshold to determine whether to trigger google search.

| JSON representation |
|---|
| ``` { "googleSearchDynamicRetrievalScore": number } ``` |

## LogprobsResult

Logprobs Result
Fields `topCandidates[]` ``object (`https://ai.google.dev/api/generate-content#TopCandidates`)`` Length = total number of decoding steps.
`chosenCandidates[]` ``object (`https://ai.google.dev/api/generate-content#Candidate`)`` Length = total number of decoding steps. The chosen candidates may or may not be in topCandidates.
`logProbabilitySum` `number` Sum of log probabilities for all tokens.

| JSON representation |
|---|
| ``` { "topCandidates": [ { object (`https://ai.google.dev/api/generate-content#TopCandidates`) } ], "chosenCandidates": [ { object (`https://ai.google.dev/api/generate-content#Candidate`) } ], "logProbabilitySum": number } ``` |

## TopCandidates

Candidates with top log probabilities at each decoding step.
Fields `candidates[]` ``object (`https://ai.google.dev/api/generate-content#Candidate`)`` Sorted by log probability in descending order.

| JSON representation |
|---|
| ``` { "candidates": [ { object (`https://ai.google.dev/api/generate-content#Candidate`) } ] } ``` |

## Candidate

Candidate for the logprobs token and score.
Fields `token` `string` The candidate's token string value.
`tokenId` `integer` The candidate's token id value.
`logProbability` `number` The candidate's log probability.

| JSON representation |
|---|
| ``` { "token": string, "tokenId": integer, "logProbability": number } ``` |

## UrlContextMetadata

Metadata related to url context retrieval tool.
Fields `urlMetadata[]` ``object (`https://ai.google.dev/api/generate-content#UrlMetadata`)`` List of url context.

| JSON representation |
|---|
| ``` { "urlMetadata": [ { object (`https://ai.google.dev/api/generate-content#UrlMetadata`) } ] } ``` |

## UrlMetadata

Context of the a single url retrieval.
Fields `retrievedUrl` `string` Retrieved url by the tool.
`urlRetrievalStatus` ``enum (`https://ai.google.dev/api/generate-content#UrlRetrievalStatus`)`` Status of the url retrieval.

| JSON representation |
|---|
| ``` { "retrievedUrl": string, "urlRetrievalStatus": enum (`https://ai.google.dev/api/generate-content#UrlRetrievalStatus`) } ``` |

## UrlRetrievalStatus

Status of the url retrieval.

| Enums ||
|---|---|
| `URL_RETRIEVAL_STATUS_UNSPECIFIED` | Default value. This value is unused. |
| `URL_RETRIEVAL_STATUS_SUCCESS` | Url retrieval is successful. |
| `URL_RETRIEVAL_STATUS_ERROR` | Url retrieval is failed due to error. |
| `URL_RETRIEVAL_STATUS_PAYWALL` | Url retrieval is failed because the content is behind paywall. |
| `URL_RETRIEVAL_STATUS_UNSAFE` | Url retrieval is failed because the content is unsafe. |

## CitationMetadata

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [CitationSource](https://ai.google.dev/api/generate-content#CitationSource)
  - [JSON representation](https://ai.google.dev/api/generate-content#CitationSource.SCHEMA_REPRESENTATION)

A collection of source attributions for a piece of content.
Fields `citationSources[]` ``object (`https://ai.google.dev/api/generate-content#CitationSource`)`` Citations to sources for a specific response.

| JSON representation |
|---|
| ``` { "citationSources": [ { object (`https://ai.google.dev/api/generate-content#CitationSource`) } ] } ``` |

## CitationSource

A citation to a source for a portion of a specific response.
Fields `startIndex` `integer` Optional. Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
`endIndex` `integer` Optional. End of the attributed segment, exclusive.
`uri` `string` Optional. URI that is attributed as a source for a portion of the text.
`license` `string` Optional. License for the GitHub project that is attributed as a source for segment.

License info is required for code citations.

| JSON representation |
|---|
| ``` { "startIndex": integer, "endIndex": integer, "uri": string, "license": string } ``` |

## HarmCategory

Harm categories that can be detected in user input and model responses.

| Enums ||
|---|---|
| `HARM_CATEGORY_UNSPECIFIED` | Default value. This value is unused. |
| `HARM_CATEGORY_HATE_SPEECH` | Content that promotes violence or incites hatred against individuals or groups based on certain attributes. |
| `HARM_CATEGORY_DANGEROUS_CONTENT` | Content that promotes, facilitates, or enables dangerous activities. |
| `HARM_CATEGORY_HARASSMENT` | Abusive, threatening, or content intended to bully, torment, or ridicule. |
| `HARM_CATEGORY_SEXUALLY_EXPLICIT` | Content that contains sexually explicit material. |
| `HARM_CATEGORY_CIVIC_INTEGRITY` | Deprecated: Election filter is not longer supported. The harm category is civic integrity. > [!WARNING] > This item is deprecated! |
| `HARM_CATEGORY_IMAGE_HATE` | Images that contain hate speech. |
| `HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT` | Images that contain dangerous content. |
| `HARM_CATEGORY_IMAGE_HARASSMENT` | Images that contain harassment. |
| `HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT` | Images that contain sexually explicit content. |
| `HARM_CATEGORY_JAILBREAK` | Prompts designed to bypass safety filters. |

## ModalityTokenCount

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [Modality](https://ai.google.dev/api/generate-content#Modality)

Represents token counting info for a single modality.
Fields `modality` ``enum (`https://ai.google.dev/api/generate-content#Modality`)`` The modality associated with this token count.
`tokenCount` `integer` Number of tokens.

| JSON representation |
|---|
| ``` { "modality": enum (`https://ai.google.dev/api/generate-content#Modality`), "tokenCount": integer } ``` |

## Modality

Content Part modality

| Enums ||
|---|---|
| `MODALITY_UNSPECIFIED` | Unspecified modality. |
| `TEXT` | Plain text. |
| `IMAGE` | Image. |
| `VIDEO` | Video. |
| `AUDIO` | Audio. |
| `DOCUMENT` | Document, e.g. PDF. |

## SafetyRating

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [HarmProbability](https://ai.google.dev/api/generate-content#HarmProbability)

Safety rating for a piece of content.

The safety rating contains the category of harm and the harm probability level in that category for a piece of content. Content is classified for safety across a number of harm categories and the probability of the harm classification is included here.
Fields `category` ``enum (`HarmCategory`)`` Required. The category for this rating.
`probability` ``enum (`https://ai.google.dev/api/generate-content#HarmProbability`)`` Required. The probability of harm for this content.
`blocked` `boolean` Was this content blocked because of this rating?

| JSON representation |
|---|
| ``` { "category": enum (`HarmCategory`), "probability": enum (`https://ai.google.dev/api/generate-content#HarmProbability`), "blocked": boolean } ``` |

## HarmProbability

The probability that a piece of content is harmful.

The classification system gives the probability of the content being unsafe. This does not indicate the severity of harm for a piece of content.

| Enums ||
|---|---|
| `HARM_PROBABILITY_UNSPECIFIED` | Probability is unspecified. |
| `NEGLIGIBLE` | Content has a negligible chance of being unsafe. |
| `LOW` | Content has a low chance of being unsafe. |
| `MEDIUM` | Content has a medium chance of being unsafe. |
| `HIGH` | Content has a high chance of being unsafe. |

## SafetySetting

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [HarmBlockThreshold](https://ai.google.dev/api/generate-content#HarmBlockThreshold)

Safety setting, affecting the safety-blocking behavior.

Passing a safety setting for a category changes the allowed probability that content is blocked.
Fields `category` ``enum (`HarmCategory`)`` Required. The category for this setting.
`threshold` ``enum (`https://ai.google.dev/api/generate-content#HarmBlockThreshold`)`` Required. Controls the probability threshold at which harm is blocked.

| JSON representation |
|---|
| ``` { "category": enum (`HarmCategory`), "threshold": enum (`https://ai.google.dev/api/generate-content#HarmBlockThreshold`) } ``` |

## HarmBlockThreshold

Block at and beyond a specified harm probability.

| Enums ||
|---|---|
| `HARM_BLOCK_THRESHOLD_UNSPECIFIED` | Threshold is unspecified. |
| `BLOCK_LOW_AND_ABOVE` | Content with NEGLIGIBLE will be allowed. |
| `BLOCK_MEDIUM_AND_ABOVE` | Content with NEGLIGIBLE and LOW will be allowed. |
| `BLOCK_ONLY_HIGH` | Content with NEGLIGIBLE, LOW, and MEDIUM will be allowed. |
| `BLOCK_NONE` | All content will be allowed. |
| `OFF` | Turn off the safety filter. |

## ServiceTier

The service tier of the interaction.

| Enums ||
|---|---|
| `SERVICE_TIER_UNSPECIFIED` | Default service tier, which is standard. |
| `SERVICE_TIER_FLEX` | Flex service tier. |
| `SERVICE_TIER_STANDARD` | Standard service tier. |
| `SERVICE_TIER_PRIORITY` | Priority service tier. |

## AllowedTools

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)

The configuration for allowed tools.
Fields `mode` ``enum (`https://ai.google.dev/api/generate-content#v1beta.ToolChoiceType`)`` The mode of the tool choice.
`tools[]` `string` The names of the allowed tools.

| JSON representation |
|---|
| ``` { "mode": enum (`https://ai.google.dev/api/generate-content#v1beta.ToolChoiceType`), "tools": [ string ] } ``` |

## Annotation

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [UrlCitation](https://ai.google.dev/api/generate-content#UrlCitation)
  - [JSON representation](https://ai.google.dev/api/generate-content#UrlCitation.SCHEMA_REPRESENTATION)
- [FileCitation](https://ai.google.dev/api/generate-content#FileCitation)
  - [JSON representation](https://ai.google.dev/api/generate-content#FileCitation.SCHEMA_REPRESENTATION)
- [PlaceCitation](https://ai.google.dev/api/generate-content#PlaceCitation)
  - [JSON representation](https://ai.google.dev/api/generate-content#PlaceCitation.SCHEMA_REPRESENTATION)

Citation information for model-generated content.
Fields `startIndex` `integer` Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
`endIndex` `integer` End of the attributed segment, exclusive.
`type` `Union type` The type of annotation. `type` can be only one of the following: `urlCitation` ``object (`https://ai.google.dev/api/generate-content#UrlCitation`)`` A URL citation annotation.
`fileCitation` ``object (`https://ai.google.dev/api/generate-content#FileCitation`)`` A file citation annotation.
`placeCitation` ``object (`https://ai.google.dev/api/generate-content#PlaceCitation`)`` A place citation annotation.

| JSON representation |
|---|
| ``` { "startIndex": integer, "endIndex": integer, // type "urlCitation": { object (`https://ai.google.dev/api/generate-content#UrlCitation`) }, "fileCitation": { object (`https://ai.google.dev/api/generate-content#FileCitation`) }, "placeCitation": { object (`https://ai.google.dev/api/generate-content#PlaceCitation`) } // Union type } ``` |

## UrlCitation

A URL citation annotation.
Fields `url` `string` The URL.
`title` `string` The title of the URL.

| JSON representation |
|---|
| ``` { "url": string, "title": string } ``` |

## FileCitation

A file citation annotation.
Fields `documentUri` `string` The URI of the file.
`fileName` `string` The name of the file.
`source` `string` Source attributed for a portion of the text.
`customMetadata` ``object (`https://ai.google.dev/api/generate-content#v1beta.Struct`)`` User provided metadata about the retrieved context.
`pageNumber` `integer` Page number of the cited document, if applicable.
`mediaId` `string` Media ID in-case of image citations, if applicable.

| JSON representation |
|---|
| ``` { "documentUri": string, "fileName": string, "source": string, "customMetadata": { object (`https://ai.google.dev/api/generate-content#v1beta.Struct`) }, "pageNumber": integer, "mediaId": string } ``` |

## PlaceCitation

A place citation annotation.
Fields `placeId` `string` The ID of the place, in `places/{placeId}` format.
`name` `string` Title of the place.
`url` `string` URI reference of the place.
`reviewSnippets[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.ReviewSnippet`)`` Snippets of reviews that are used to generate answers about the features of a given place in Google Maps.

| JSON representation |
|---|
| ``` { "placeId": string, "name": string, "url": string, "reviewSnippets": [ { object (`https://ai.google.dev/api/generate-content#v1beta.ReviewSnippet`) } ] } ``` |

## AspectRatio

Supported aspect ratios for image output.

| Enums ||
|---|---|
| `ASPECT_RATIO_UNSPECIFIED` | Default value. This value is unused. |
| `ASPECT_RATIO_ONE_BY_ONE` | 1:1 aspect ratio. |
| `ASPECT_RATIO_TWO_BY_THREE` | 2:3 aspect ratio. |
| `ASPECT_RATIO_THREE_BY_TWO` | 3:2 aspect ratio. |
| `ASPECT_RATIO_THREE_BY_FOUR` | 3:4 aspect ratio. |
| `ASPECT_RATIO_FOUR_BY_THREE` | 4:3 aspect ratio. |
| `ASPECT_RATIO_FOUR_BY_FIVE` | 4:5 aspect ratio. |
| `ASPECT_RATIO_FIVE_BY_FOUR` | 5:4 aspect ratio. |
| `ASPECT_RATIO_NINE_BY_SIXTEEN` | 9:16 aspect ratio. |
| `ASPECT_RATIO_SIXTEEN_BY_NINE` | 16:9 aspect ratio. |
| `ASPECT_RATIO_TWENTY_ONE_BY_NINE` | 21:9 aspect ratio. |
| `ASPECT_RATIO_ONE_BY_EIGHT` | 1:8 aspect ratio. |
| `ASPECT_RATIO_EIGHT_BY_ONE` | 8:1 aspect ratio. |
| `ASPECT_RATIO_ONE_BY_FOUR` | 1:4 aspect ratio. |
| `ASPECT_RATIO_FOUR_BY_ONE` | 4:1 aspect ratio. |

## AudioResponseFormat

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)

Configuration for audio output format.
Fields `mimeType` ``enum (`MimeType`)`` The MIME type of the audio output.
`delivery` ``enum (`https://ai.google.dev/api/generate-content#v1beta.Delivery`)`` The delivery mode for the audio output.
`sampleRate` `integer` Sample rate in Hz.
`bitRate` `integer` Bit rate in bits per second (bps). Only applicable for compressed formats (MP3, Opus).

| JSON representation |
|---|
| ``` { "mimeType": enum (`MimeType`), "delivery": enum (`https://ai.google.dev/api/generate-content#v1beta.Delivery`), "sampleRate": integer, "bitRate": integer } ``` |

## CodeExecution

This type has no fields.
A tool that can be used by the model to execute code.

## CodeExecutionCallStep

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [CodeExecutionCallStepArguments](https://ai.google.dev/api/generate-content#CodeExecutionCallStepArguments)
  - [JSON representation](https://ai.google.dev/api/generate-content#CodeExecutionCallStepArguments.SCHEMA_REPRESENTATION)

Code execution call step.
Fields `arguments` ``object (`https://ai.google.dev/api/generate-content#CodeExecutionCallStepArguments`)`` Required. The arguments to pass to the code execution.

| JSON representation |
|---|
| ``` { "arguments": { object (`https://ai.google.dev/api/generate-content#CodeExecutionCallStepArguments`) } } ``` |

## CodeExecutionCallStepArguments

The arguments to pass to the code execution.
Fields `language` ``enum (`Language`)`` Programming language of the `code`.
`code` `string` The code to be executed.

| JSON representation |
|---|
| ``` { "language": enum (`Language`), "code": string } ``` |

## CodeExecutionResultStep

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)

Code execution result step.
Fields `result` `string` Required. The output of the code execution.
`isError` `boolean` Whether the code execution resulted in an error.

| JSON representation |
|---|
| ``` { "result": string, "isError": boolean } ``` |

## ComputerUse

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)

A tool that can be used by the model to interact with the computer.
Fields `environment` ``enum (`https://ai.google.dev/api/generate-content#v1beta.Environment`)`` The environment being operated.
`excludedPredefinedFunctions[]` `string` The list of predefined functions that are excluded from the model call.
`enablePromptInjectionDetection` `boolean` Whether enable the prompt injection detection check on computer-use request.
`disabledSafetyPolicies[]` ``enum (`https://ai.google.dev/api/generate-content#v1beta.SafetyPolicy`)`` Optional. Disabled safety policies for computer use.

| JSON representation |
|---|
| ``` { "environment": enum (`https://ai.google.dev/api/generate-content#v1beta.Environment`), "excludedPredefinedFunctions": [ string ], "enablePromptInjectionDetection": boolean, "disabledSafetyPolicies": [ enum (`https://ai.google.dev/api/generate-content#v1beta.SafetyPolicy`) ] } ``` |

## Content

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [TextContent](https://ai.google.dev/api/generate-content#TextContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#TextContent.SCHEMA_REPRESENTATION)
- [ImageContent](https://ai.google.dev/api/generate-content#ImageContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#ImageContent.SCHEMA_REPRESENTATION)
- [AudioContent](https://ai.google.dev/api/generate-content#AudioContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#AudioContent.SCHEMA_REPRESENTATION)
- [DocumentContent](https://ai.google.dev/api/generate-content#DocumentContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#DocumentContent.SCHEMA_REPRESENTATION)
- [VideoContent](https://ai.google.dev/api/generate-content#VideoContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#VideoContent.SCHEMA_REPRESENTATION)
- [ThoughtContent](https://ai.google.dev/api/generate-content#ThoughtContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#ThoughtContent.SCHEMA_REPRESENTATION)
- [ThoughtSummaryContent](https://ai.google.dev/api/generate-content#ThoughtSummaryContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#ThoughtSummaryContent.SCHEMA_REPRESENTATION)
- [ToolCallContent](https://ai.google.dev/api/generate-content#ToolCallContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#ToolCallContent.SCHEMA_REPRESENTATION)
- [FunctionCallContent](https://ai.google.dev/api/generate-content#FunctionCallContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#FunctionCallContent.SCHEMA_REPRESENTATION)
- [CodeExecutionCallContent](https://ai.google.dev/api/generate-content#CodeExecutionCallContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#CodeExecutionCallContent.SCHEMA_REPRESENTATION)
- [CodeExecutionCallArguments](https://ai.google.dev/api/generate-content#CodeExecutionCallArguments)
  - [JSON representation](https://ai.google.dev/api/generate-content#CodeExecutionCallArguments.SCHEMA_REPRESENTATION)
- [UrlContextCallContent](https://ai.google.dev/api/generate-content#UrlContextCallContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#UrlContextCallContent.SCHEMA_REPRESENTATION)
- [UrlContextCallArguments](https://ai.google.dev/api/generate-content#UrlContextCallArguments)
  - [JSON representation](https://ai.google.dev/api/generate-content#UrlContextCallArguments.SCHEMA_REPRESENTATION)
- [McpServerToolCallContent](https://ai.google.dev/api/generate-content#McpServerToolCallContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#McpServerToolCallContent.SCHEMA_REPRESENTATION)
- [GoogleSearchCallContent](https://ai.google.dev/api/generate-content#GoogleSearchCallContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleSearchCallContent.SCHEMA_REPRESENTATION)
- [GoogleSearchCallArguments](https://ai.google.dev/api/generate-content#GoogleSearchCallArguments)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleSearchCallArguments.SCHEMA_REPRESENTATION)
- [FileSearchCallContent](https://ai.google.dev/api/generate-content#FileSearchCallContent)
- [GoogleMapsCallContent](https://ai.google.dev/api/generate-content#GoogleMapsCallContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleMapsCallContent.SCHEMA_REPRESENTATION)
- [GoogleMapsCallArguments](https://ai.google.dev/api/generate-content#GoogleMapsCallArguments)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleMapsCallArguments.SCHEMA_REPRESENTATION)
- [ToolResultContent](https://ai.google.dev/api/generate-content#ToolResultContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#ToolResultContent.SCHEMA_REPRESENTATION)
- [FunctionResultContent](https://ai.google.dev/api/generate-content#FunctionResultContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#FunctionResultContent.SCHEMA_REPRESENTATION)
- [FunctionResultSubcontentList](https://ai.google.dev/api/generate-content#FunctionResultSubcontentList)
  - [JSON representation](https://ai.google.dev/api/generate-content#FunctionResultSubcontentList.SCHEMA_REPRESENTATION)
- [FunctionResultSubcontent](https://ai.google.dev/api/generate-content#FunctionResultSubcontent)
  - [JSON representation](https://ai.google.dev/api/generate-content#FunctionResultSubcontent.SCHEMA_REPRESENTATION)
- [CodeExecutionResultContent](https://ai.google.dev/api/generate-content#CodeExecutionResultContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#CodeExecutionResultContent.SCHEMA_REPRESENTATION)
- [UrlContextResultContent](https://ai.google.dev/api/generate-content#UrlContextResultContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#UrlContextResultContent.SCHEMA_REPRESENTATION)
- [UrlContextResult](https://ai.google.dev/api/generate-content#UrlContextResult)
  - [JSON representation](https://ai.google.dev/api/generate-content#UrlContextResult.SCHEMA_REPRESENTATION)
- [GoogleSearchResultContent](https://ai.google.dev/api/generate-content#GoogleSearchResultContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleSearchResultContent.SCHEMA_REPRESENTATION)
- [GoogleSearchResult](https://ai.google.dev/api/generate-content#GoogleSearchResult)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleSearchResult.SCHEMA_REPRESENTATION)
- [McpServerToolResultContent](https://ai.google.dev/api/generate-content#McpServerToolResultContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#McpServerToolResultContent.SCHEMA_REPRESENTATION)
- [FileSearchResultContent](https://ai.google.dev/api/generate-content#FileSearchResultContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#FileSearchResultContent.SCHEMA_REPRESENTATION)
- [FileSearchResult](https://ai.google.dev/api/generate-content#FileSearchResult)
- [GoogleMapsResultContent](https://ai.google.dev/api/generate-content#GoogleMapsResultContent)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleMapsResultContent.SCHEMA_REPRESENTATION)
- [GoogleMapsResult](https://ai.google.dev/api/generate-content#GoogleMapsResult)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleMapsResult.SCHEMA_REPRESENTATION)
- [Places](https://ai.google.dev/api/generate-content#Places)
  - [JSON representation](https://ai.google.dev/api/generate-content#Places.SCHEMA_REPRESENTATION)

The content of the response.
Fields `type` `Union type` `type` can be only one of the following: `text` ``object (`https://ai.google.dev/api/generate-content#TextContent`)`` `image` ``object (`https://ai.google.dev/api/generate-content#ImageContent`)`` `audio` ``object (`https://ai.google.dev/api/generate-content#AudioContent`)`` `document` ``object (`https://ai.google.dev/api/generate-content#DocumentContent`)`` `video` ``object (`https://ai.google.dev/api/generate-content#VideoContent`)`` `thought
(deprecated)` ``object (`https://ai.google.dev/api/generate-content#ThoughtContent`)``

> [!WARNING]
> This item is deprecated!

`toolCall
(deprecated)` ``object (`https://ai.google.dev/api/generate-content#ToolCallContent`)``

> [!WARNING]
> This item is deprecated!

`toolResult
(deprecated)` ``object (`https://ai.google.dev/api/generate-content#ToolResultContent`)``

> [!WARNING]
> This item is deprecated!

| JSON representation |
|---|
| ``` { // type "text": { object (`https://ai.google.dev/api/generate-content#TextContent`) }, "image": { object (`https://ai.google.dev/api/generate-content#ImageContent`) }, "audio": { object (`https://ai.google.dev/api/generate-content#AudioContent`) }, "document": { object (`https://ai.google.dev/api/generate-content#DocumentContent`) }, "video": { object (`https://ai.google.dev/api/generate-content#VideoContent`) }, "thought": { object (`https://ai.google.dev/api/generate-content#ThoughtContent`) }, "toolCall": { object (`https://ai.google.dev/api/generate-content#ToolCallContent`) }, "toolResult": { object (`https://ai.google.dev/api/generate-content#ToolResultContent`) } // Union type } ``` |

## TextContent

A text content block.
Fields `text` `string` Required. The text content.
`annotations[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.Annotation`)`` Citation information for model-generated content.

| JSON representation |
|---|
| ``` { "text": string, "annotations": [ { object (`https://ai.google.dev/api/generate-content#v1beta.Annotation`) } ] } ``` |

## ImageContent

An image content block.
Fields `mimeType` ``enum (`MimeType`)`` The mime type of the image.
`resolution` ``enum (`https://ai.google.dev/api/generate-content#v1beta.MediaResolution`)`` The resolution of the media.
`data_or_uri` `Union type` The image content. `data_or_uri` can be only one of the following: `data` `string (https://developers.google.com/discovery/v1/type-format format)` The image content.

A base64-encoded string.
`uri` `string` The URI of the image.

| JSON representation |
|---|
| ``` { "mimeType": enum (`MimeType`), "resolution": enum (`https://ai.google.dev/api/generate-content#v1beta.MediaResolution`), // data_or_uri "data": string, "uri": string // Union type } ``` |

## AudioContent

An audio content block.
Fields `mimeType` ``enum (`https://ai.google.dev/api/generate-content#v1beta.MimeType`)`` The mime type of the audio.
`channels` `integer` The number of audio channels.
`sampleRate` `integer` The sample rate of the audio.
`data_or_uri` `Union type` The audio content. `data_or_uri` can be only one of the following: `data` `string (https://developers.google.com/discovery/v1/type-format format)` The audio content.

A base64-encoded string.
`uri` `string` The URI of the audio.

| JSON representation |
|---|
| ``` { "mimeType": enum (`https://ai.google.dev/api/generate-content#v1beta.MimeType`), "channels": integer, "sampleRate": integer, // data_or_uri "data": string, "uri": string // Union type } ``` |

## DocumentContent

A document content block.
Fields `mimeType` ``enum (`MimeType`)`` The mime type of the document.
`data_or_uri` `Union type` The document content. `data_or_uri` can be only one of the following: `data` `string (https://developers.google.com/discovery/v1/type-format format)` The document content.

A base64-encoded string.
`uri` `string` The URI of the document.

| JSON representation |
|---|
| ``` { "mimeType": enum (`MimeType`), // data_or_uri "data": string, "uri": string // Union type } ``` |

## VideoContent

A video content block.
Fields `mimeType` ``enum (`MimeType`)`` The mime type of the video.
`resolution` ``enum (`https://ai.google.dev/api/generate-content#v1beta.MediaResolution`)`` The resolution of the media.
`data_or_uri` `Union type` The video content. `data_or_uri` can be only one of the following: `data` `string (https://developers.google.com/discovery/v1/type-format format)` The video content.

A base64-encoded string.
`uri` `string` The URI of the video.

| JSON representation |
|---|
| ``` { "mimeType": enum (`MimeType`), "resolution": enum (`https://ai.google.dev/api/generate-content#v1beta.MediaResolution`), // data_or_uri "data": string, "uri": string // Union type } ``` |

## ThoughtContent

> [!WARNING]
> This item is deprecated!

A thought content block.
Fields `signature` `string (https://developers.google.com/discovery/v1/type-format format)` Signature to match the backend source to be part of the generation.

A base64-encoded string.
`summary[]` ``object (`https://ai.google.dev/api/generate-content#ThoughtSummaryContent`)`` A summary of the thought.

| JSON representation |
|---|
| ``` { "signature": string, "summary": [ { object (`https://ai.google.dev/api/generate-content#ThoughtSummaryContent`) } ] } ``` |

## ThoughtSummaryContent

Fields `type` `Union type` `type` can be only one of the following: `text` ``object (`https://ai.google.dev/api/generate-content#TextContent`)`` `image` ``object (`https://ai.google.dev/api/generate-content#ImageContent`)``

| JSON representation |
|---|
| ``` { // type "text": { object (`https://ai.google.dev/api/generate-content#TextContent`) }, "image": { object (`https://ai.google.dev/api/generate-content#ImageContent`) } // Union type } ``` |

## ToolCallContent

> [!WARNING]
> This item is deprecated!

Tool call content.
Fields `id` `string` Required. A unique ID for this specific tool call.
`signature` `string (https://developers.google.com/discovery/v1/type-format format)` A signature hash for backend validation.

A base64-encoded string.
`type` `Union type` `type` can be only one of the following: `functionCall` ``object (`https://ai.google.dev/api/generate-content#FunctionCallContent`)`` `codeExecutionCall` ``object (`https://ai.google.dev/api/generate-content#CodeExecutionCallContent`)`` `urlContextCall` ``object (`https://ai.google.dev/api/generate-content#UrlContextCallContent`)`` `mcpServerToolCall` ``object (`https://ai.google.dev/api/generate-content#McpServerToolCallContent`)`` `googleSearchCall` ``object (`https://ai.google.dev/api/generate-content#GoogleSearchCallContent`)`` `fileSearchCall` ``object (`https://ai.google.dev/api/generate-content#FileSearchCallContent`)`` `googleMapsCall` ``object (`https://ai.google.dev/api/generate-content#GoogleMapsCallContent`)``

| JSON representation |
|---|
| ``` { "id": string, "signature": string, // type "functionCall": { object (`https://ai.google.dev/api/generate-content#FunctionCallContent`) }, "codeExecutionCall": { object (`https://ai.google.dev/api/generate-content#CodeExecutionCallContent`) }, "urlContextCall": { object (`https://ai.google.dev/api/generate-content#UrlContextCallContent`) }, "mcpServerToolCall": { object (`https://ai.google.dev/api/generate-content#McpServerToolCallContent`) }, "googleSearchCall": { object (`https://ai.google.dev/api/generate-content#GoogleSearchCallContent`) }, "fileSearchCall": { object (`https://ai.google.dev/api/generate-content#FileSearchCallContent`) }, "googleMapsCall": { object (`https://ai.google.dev/api/generate-content#GoogleMapsCallContent`) } // Union type } ``` |

## FunctionCallContent

> [!WARNING]
> This item is deprecated!

A function tool call content block.
Fields `name` `string` Required. The name of the tool to call.
`arguments` ``object (`https://ai.google.dev/api/generate-content#v1beta.Struct`)`` Required. The arguments to pass to the function.

| JSON representation |
|---|
| ``` { "name": string, "arguments": { object (`https://ai.google.dev/api/generate-content#v1beta.Struct`) } } ``` |

## CodeExecutionCallContent

> [!WARNING]
> This item is deprecated!

Code execution content.
Fields `arguments` ``object (`https://ai.google.dev/api/generate-content#CodeExecutionCallArguments`)`` Required. The arguments to pass to the code execution.

| JSON representation |
|---|
| ``` { "arguments": { object (`https://ai.google.dev/api/generate-content#CodeExecutionCallArguments`) } } ``` |

## CodeExecutionCallArguments

The arguments to pass to the code execution.
Fields `language` ``enum (`https://ai.google.dev/api/generate-content#v1beta.Language`)`` Programming language of the `code`.
`code` `string` The code to be executed.

| JSON representation |
|---|
| ``` { "language": enum (`https://ai.google.dev/api/generate-content#v1beta.Language`), "code": string } ``` |

## UrlContextCallContent

> [!WARNING]
> This item is deprecated!

URL context content.
Fields `arguments` ``object (`https://ai.google.dev/api/generate-content#UrlContextCallArguments`)`` Required. The arguments to pass to the URL context.

| JSON representation |
|---|
| ``` { "arguments": { object (`https://ai.google.dev/api/generate-content#UrlContextCallArguments`) } } ``` |

## UrlContextCallArguments

The arguments to pass to the URL context.
Fields `urls[]` `string` The URLs to fetch.

| JSON representation |
|---|
| ``` { "urls": [ string ] } ``` |

## McpServerToolCallContent

MCPServer tool call content.
Fields `name` `string` Required. The name of the tool which was called.
`serverName` `string` Required. The name of the used MCP server.
`arguments` ``object (`https://ai.google.dev/api/generate-content#v1beta.Struct`)`` Required. The JSON object of arguments for the function.

| JSON representation |
|---|
| ``` { "name": string, "serverName": string, "arguments": { object (`https://ai.google.dev/api/generate-content#v1beta.Struct`) } } ``` |

## GoogleSearchCallContent

> [!WARNING]
> This item is deprecated!

Google Search content.
Fields `arguments` ``object (`https://ai.google.dev/api/generate-content#GoogleSearchCallArguments`)`` Required. The arguments to pass to Google Search.
`searchType` ``enum (`https://ai.google.dev/api/generate-content#v1beta.SearchType`)`` The type of search grounding enabled.

| JSON representation |
|---|
| ``` { "arguments": { object (`https://ai.google.dev/api/generate-content#GoogleSearchCallArguments`) }, "searchType": enum (`https://ai.google.dev/api/generate-content#v1beta.SearchType`) } ``` |

## GoogleSearchCallArguments

The arguments to pass to Google Search.
Fields `queries[]` `string` Web search queries for the following-up web search.

| JSON representation |
|---|
| ``` { "queries": [ string ] } ``` |

## FileSearchCallContent

This type has no fields.

> [!WARNING]
> This item is deprecated!

File Search content.

## GoogleMapsCallContent

> [!WARNING]
> This item is deprecated!

Google Maps content.
Fields `arguments` ``object (`https://ai.google.dev/api/generate-content#GoogleMapsCallArguments`)`` The arguments to pass to the Google Maps tool.

| JSON representation |
|---|
| ``` { "arguments": { object (`https://ai.google.dev/api/generate-content#GoogleMapsCallArguments`) } } ``` |

## GoogleMapsCallArguments

The arguments to pass to the Google Maps tool.
Fields `queries[]` `string` The queries to be executed.

| JSON representation |
|---|
| ``` { "queries": [ string ] } ``` |

## ToolResultContent

> [!WARNING]
> This item is deprecated!

Tool result content.
Fields `callId` `string` Required. ID to match the ID from the function call block.
`signature` `string (https://developers.google.com/discovery/v1/type-format format)` A signature hash for backend validation.

A base64-encoded string.
`type` `Union type` `type` can be only one of the following: `functionResult` ``object (`https://ai.google.dev/api/generate-content#FunctionResultContent`)`` `codeExecutionResult` ``object (`https://ai.google.dev/api/generate-content#CodeExecutionResultContent`)`` `urlContextResult` ``object (`https://ai.google.dev/api/generate-content#UrlContextResultContent`)`` `googleSearchResult` ``object (`https://ai.google.dev/api/generate-content#GoogleSearchResultContent`)`` `mcpServerToolResult` ``object (`https://ai.google.dev/api/generate-content#McpServerToolResultContent`)`` `fileSearchResult` ``object (`https://ai.google.dev/api/generate-content#FileSearchResultContent`)`` `googleMapsResult` ``object (`https://ai.google.dev/api/generate-content#GoogleMapsResultContent`)``

| JSON representation |
|---|
| ``` { "callId": string, "signature": string, // type "functionResult": { object (`https://ai.google.dev/api/generate-content#FunctionResultContent`) }, "codeExecutionResult": { object (`https://ai.google.dev/api/generate-content#CodeExecutionResultContent`) }, "urlContextResult": { object (`https://ai.google.dev/api/generate-content#UrlContextResultContent`) }, "googleSearchResult": { object (`https://ai.google.dev/api/generate-content#GoogleSearchResultContent`) }, "mcpServerToolResult": { object (`https://ai.google.dev/api/generate-content#McpServerToolResultContent`) }, "fileSearchResult": { object (`https://ai.google.dev/api/generate-content#FileSearchResultContent`) }, "googleMapsResult": { object (`https://ai.google.dev/api/generate-content#GoogleMapsResultContent`) } // Union type } ``` |

## FunctionResultContent

> [!WARNING]
> This item is deprecated!

A function tool result content block.
Fields `name` `string` The name of the tool that was called.
`isError` `boolean` Whether the tool call resulted in an error.
`result` `Union type` The result of the tool call. `result` can be only one of the following: `structResult` ``object (`https://ai.google.dev/api/generate-content#v1beta.Struct`)`` `contentList` ``object (`https://ai.google.dev/api/generate-content#FunctionResultSubcontentList`)`` `stringResult` `string`

| JSON representation |
|---|
| ``` { "name": string, "isError": boolean, // result "structResult": { object (`https://ai.google.dev/api/generate-content#v1beta.Struct`) }, "contentList": { object (`https://ai.google.dev/api/generate-content#FunctionResultSubcontentList`) }, "stringResult": string // Union type } ``` |

## FunctionResultSubcontentList

Fields `contents[]` ``object (`https://ai.google.dev/api/generate-content#FunctionResultSubcontent`)``

| JSON representation |
|---|
| ``` { "contents": [ { object (`https://ai.google.dev/api/generate-content#FunctionResultSubcontent`) } ] } ``` |

## FunctionResultSubcontent

Fields `type` `Union type` `type` can be only one of the following: `text` ``object (`https://ai.google.dev/api/generate-content#TextContent`)`` `image` ``object (`https://ai.google.dev/api/generate-content#ImageContent`)``

| JSON representation |
|---|
| ``` { // type "text": { object (`https://ai.google.dev/api/generate-content#TextContent`) }, "image": { object (`https://ai.google.dev/api/generate-content#ImageContent`) } // Union type } ``` |

## CodeExecutionResultContent

> [!WARNING]
> This item is deprecated!

Code execution result content.
Fields `result` `string` Required. The output of the code execution.
`isError` `boolean` Whether the code execution resulted in an error.

| JSON representation |
|---|
| ``` { "result": string, "isError": boolean } ``` |

## UrlContextResultContent

> [!WARNING]
> This item is deprecated!

URL context result content.
Fields `result[]` ``object (`https://ai.google.dev/api/generate-content#UrlContextResult`)`` Required. The results of the URL context.
`isError` `boolean` Whether the URL context resulted in an error.

| JSON representation |
|---|
| ``` { "result": [ { object (`https://ai.google.dev/api/generate-content#UrlContextResult`) } ], "isError": boolean } ``` |

## UrlContextResult

The result of the URL context.
Fields `url` `string` The URL that was fetched.
`status` ``enum (`Status`)`` The status of the URL retrieval.

| JSON representation |
|---|
| ``` { "url": string, "status": enum (`Status`) } ``` |

## GoogleSearchResultContent

> [!WARNING]
> This item is deprecated!

Google Search result content.
Fields `result[]` ``object (`https://ai.google.dev/api/generate-content#GoogleSearchResult`)`` Required. The results of the Google Search.
`isError` `boolean` Whether the Google Search resulted in an error.

| JSON representation |
|---|
| ``` { "result": [ { object (`https://ai.google.dev/api/generate-content#GoogleSearchResult`) } ], "isError": boolean } ``` |

## GoogleSearchResult

The result of the Google Search.
Fields `searchSuggestions` `string` Web content snippet that can be embedded in a web page or an app webview.

| JSON representation |
|---|
| ``` { "searchSuggestions": string } ``` |

## McpServerToolResultContent

MCPServer tool result content.
Fields `name` `string` Name of the tool which is called for this specific tool call.
`serverName` `string` The name of the used MCP server.
`result` `Union type` The output from the MCP server call. Can be simple text or rich content. `result` can be only one of the following: `structResult` ``object (`https://ai.google.dev/api/generate-content#v1beta.Struct`)`` `contentList` ``object (`https://ai.google.dev/api/generate-content#FunctionResultSubcontentList`)`` `stringResult` `string`

| JSON representation |
|---|
| ``` { "name": string, "serverName": string, // result "structResult": { object (`https://ai.google.dev/api/generate-content#v1beta.Struct`) }, "contentList": { object (`https://ai.google.dev/api/generate-content#FunctionResultSubcontentList`) }, "stringResult": string // Union type } ``` |

## FileSearchResultContent

> [!WARNING]
> This item is deprecated!

File Search result content.
Fields `result[]` ``object (`https://ai.google.dev/api/generate-content#FileSearchResult`)`` Optional. The results of the File Search.

| JSON representation |
|---|
| ``` { "result": [ { object (`https://ai.google.dev/api/generate-content#FileSearchResult`) } ] } ``` |

## FileSearchResult

This type has no fields.
The result of the File Search.

## GoogleMapsResultContent

> [!WARNING]
> This item is deprecated!

Google Maps result content.
Fields `result[]` ``object (`https://ai.google.dev/api/generate-content#GoogleMapsResult`)`` Required. The results of the Google Maps.

| JSON representation |
|---|
| ``` { "result": [ { object (`https://ai.google.dev/api/generate-content#GoogleMapsResult`) } ] } ``` |

## GoogleMapsResult

The result of the Google Maps.
Fields `places[]` ``object (`https://ai.google.dev/api/generate-content#Places`)`` The places that were found.
`widgetContextToken` `string` Resource name of the Google Maps widget context token.

| JSON representation |
|---|
| ``` { "places": [ { object (`https://ai.google.dev/api/generate-content#Places`) } ], "widgetContextToken": string } ``` |

## Places

Fields `placeId` `string` The ID of the place, in `places/{placeId}` format.
`name` `string` Title of the place.
`url` `string` URI reference of the place.
`reviewSnippets[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.ReviewSnippet`)`` Snippets of reviews that are used to generate answers about the features of a given place in Google Maps.

| JSON representation |
|---|
| ``` { "placeId": string, "name": string, "url": string, "reviewSnippets": [ { object (`https://ai.google.dev/api/generate-content#v1beta.ReviewSnippet`) } ] } ``` |

## ContentList

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)

A list of Content.
Fields `contents[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.Content`)`` The contents of the list.

| JSON representation |
|---|
| ``` { "contents": [ { object (`https://ai.google.dev/api/generate-content#v1beta.Content`) } ] } ``` |

## CreateInteractionRequest

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [Interaction](https://ai.google.dev/api/generate-content#Interaction)
  - [JSON representation](https://ai.google.dev/api/generate-content#Interaction.SCHEMA_REPRESENTATION)
- [TurnList](https://ai.google.dev/api/generate-content#TurnList)
  - [JSON representation](https://ai.google.dev/api/generate-content#TurnList.SCHEMA_REPRESENTATION)
- [Turn](https://ai.google.dev/api/generate-content#Turn)
  - [JSON representation](https://ai.google.dev/api/generate-content#Turn.SCHEMA_REPRESENTATION)
- [StepList](https://ai.google.dev/api/generate-content#StepList)
  - [JSON representation](https://ai.google.dev/api/generate-content#StepList.SCHEMA_REPRESENTATION)
- [Step](https://ai.google.dev/api/generate-content#Step)
  - [JSON representation](https://ai.google.dev/api/generate-content#Step.SCHEMA_REPRESENTATION)
- [ThoughtStep](https://ai.google.dev/api/generate-content#ThoughtStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#ThoughtStep.SCHEMA_REPRESENTATION)
- [ToolCallStep](https://ai.google.dev/api/generate-content#ToolCallStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#ToolCallStep.SCHEMA_REPRESENTATION)
- [FunctionCallStep](https://ai.google.dev/api/generate-content#FunctionCallStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#FunctionCallStep.SCHEMA_REPRESENTATION)
- [UrlContextCallStep](https://ai.google.dev/api/generate-content#UrlContextCallStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#UrlContextCallStep.SCHEMA_REPRESENTATION)
- [UrlContextCallStepArguments](https://ai.google.dev/api/generate-content#UrlContextCallStepArguments)
  - [JSON representation](https://ai.google.dev/api/generate-content#UrlContextCallStepArguments.SCHEMA_REPRESENTATION)
- [McpServerToolCallStep](https://ai.google.dev/api/generate-content#McpServerToolCallStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#McpServerToolCallStep.SCHEMA_REPRESENTATION)
- [GoogleSearchCallStep](https://ai.google.dev/api/generate-content#GoogleSearchCallStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleSearchCallStep.SCHEMA_REPRESENTATION)
- [GoogleSearchCallStepArguments](https://ai.google.dev/api/generate-content#GoogleSearchCallStepArguments)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleSearchCallStepArguments.SCHEMA_REPRESENTATION)
- [FileSearchCallStep](https://ai.google.dev/api/generate-content#FileSearchCallStep)
- [GoogleMapsCallStep](https://ai.google.dev/api/generate-content#GoogleMapsCallStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleMapsCallStep.SCHEMA_REPRESENTATION)
- [GoogleMapsCallStepArguments](https://ai.google.dev/api/generate-content#GoogleMapsCallStepArguments)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleMapsCallStepArguments.SCHEMA_REPRESENTATION)
- [ToolResultStep](https://ai.google.dev/api/generate-content#ToolResultStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#ToolResultStep.SCHEMA_REPRESENTATION)
- [FunctionResultStep](https://ai.google.dev/api/generate-content#FunctionResultStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#FunctionResultStep.SCHEMA_REPRESENTATION)
- [UrlContextResultStep](https://ai.google.dev/api/generate-content#UrlContextResultStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#UrlContextResultStep.SCHEMA_REPRESENTATION)
- [UrlContextResultItem](https://ai.google.dev/api/generate-content#UrlContextResultItem)
  - [JSON representation](https://ai.google.dev/api/generate-content#UrlContextResultItem.SCHEMA_REPRESENTATION)
- [GoogleSearchResultStep](https://ai.google.dev/api/generate-content#GoogleSearchResultStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleSearchResultStep.SCHEMA_REPRESENTATION)
- [GoogleSearchResultItem](https://ai.google.dev/api/generate-content#GoogleSearchResultItem)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleSearchResultItem.SCHEMA_REPRESENTATION)
- [McpServerToolResultStep](https://ai.google.dev/api/generate-content#McpServerToolResultStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#McpServerToolResultStep.SCHEMA_REPRESENTATION)
- [FileSearchResultStep](https://ai.google.dev/api/generate-content#FileSearchResultStep)
- [GoogleMapsResultStep](https://ai.google.dev/api/generate-content#GoogleMapsResultStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleMapsResultStep.SCHEMA_REPRESENTATION)
- [GoogleMapsResultItem](https://ai.google.dev/api/generate-content#GoogleMapsResultItem)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleMapsResultItem.SCHEMA_REPRESENTATION)
- [GoogleMapsResultPlaces](https://ai.google.dev/api/generate-content#GoogleMapsResultPlaces)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleMapsResultPlaces.SCHEMA_REPRESENTATION)
- [UserInputStep](https://ai.google.dev/api/generate-content#UserInputStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#UserInputStep.SCHEMA_REPRESENTATION)
- [ModelOutputStep](https://ai.google.dev/api/generate-content#ModelOutputStep)
  - [JSON representation](https://ai.google.dev/api/generate-content#ModelOutputStep.SCHEMA_REPRESENTATION)
- [ResponseFormatList](https://ai.google.dev/api/generate-content#ResponseFormatList)
  - [JSON representation](https://ai.google.dev/api/generate-content#ResponseFormatList.SCHEMA_REPRESENTATION)
- [ResponseFormat](https://ai.google.dev/api/generate-content#ResponseFormat)
  - [JSON representation](https://ai.google.dev/api/generate-content#ResponseFormat.SCHEMA_REPRESENTATION)
- [TextResponseFormat](https://ai.google.dev/api/generate-content#TextResponseFormat)
  - [JSON representation](https://ai.google.dev/api/generate-content#TextResponseFormat.SCHEMA_REPRESENTATION)
- [ImageResponseFormat](https://ai.google.dev/api/generate-content#ImageResponseFormat)
  - [JSON representation](https://ai.google.dev/api/generate-content#ImageResponseFormat.SCHEMA_REPRESENTATION)
- [VideoResponseFormat](https://ai.google.dev/api/generate-content#VideoResponseFormat)
  - [JSON representation](https://ai.google.dev/api/generate-content#VideoResponseFormat.SCHEMA_REPRESENTATION)
- [ModelInteraction](https://ai.google.dev/api/generate-content#ModelInteraction)
  - [JSON representation](https://ai.google.dev/api/generate-content#ModelInteraction.SCHEMA_REPRESENTATION)
- [GenerationConfig](https://ai.google.dev/api/generate-content#GenerationConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#GenerationConfig.SCHEMA_REPRESENTATION)
- [ToolChoiceConfig](https://ai.google.dev/api/generate-content#ToolChoiceConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#ToolChoiceConfig.SCHEMA_REPRESENTATION)
- [SpeechConfig](https://ai.google.dev/api/generate-content#SpeechConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#SpeechConfig.SCHEMA_REPRESENTATION)
- [ImageConfig](https://ai.google.dev/api/generate-content#ImageConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#ImageConfig.SCHEMA_REPRESENTATION)
- [VideoConfig](https://ai.google.dev/api/generate-content#VideoConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#VideoConfig.SCHEMA_REPRESENTATION)
- [EnvironmentConfig](https://ai.google.dev/api/generate-content#EnvironmentConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#EnvironmentConfig.SCHEMA_REPRESENTATION)
- [EnvironmentNetworkEgressAllowlist](https://ai.google.dev/api/generate-content#EnvironmentNetworkEgressAllowlist)
  - [JSON representation](https://ai.google.dev/api/generate-content#EnvironmentNetworkEgressAllowlist.SCHEMA_REPRESENTATION)
- [EgressRule](https://ai.google.dev/api/generate-content#EgressRule)
  - [JSON representation](https://ai.google.dev/api/generate-content#EgressRule.SCHEMA_REPRESENTATION)
- [Source](https://ai.google.dev/api/generate-content#Source)
  - [JSON representation](https://ai.google.dev/api/generate-content#Source.SCHEMA_REPRESENTATION)
- [LocalEnvironmentConfig](https://ai.google.dev/api/generate-content#LocalEnvironmentConfig)
- [Tool](https://ai.google.dev/api/generate-content#Tool)
  - [JSON representation](https://ai.google.dev/api/generate-content#Tool.SCHEMA_REPRESENTATION)
- [Function](https://ai.google.dev/api/generate-content#Function)
  - [JSON representation](https://ai.google.dev/api/generate-content#Function.SCHEMA_REPRESENTATION)
- [UrlContext](https://ai.google.dev/api/generate-content#UrlContext)
- [McpServer](https://ai.google.dev/api/generate-content#McpServer)
  - [JSON representation](https://ai.google.dev/api/generate-content#McpServer.SCHEMA_REPRESENTATION)
- [GoogleSearch](https://ai.google.dev/api/generate-content#GoogleSearch)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleSearch.SCHEMA_REPRESENTATION)
- [FileSearch](https://ai.google.dev/api/generate-content#FileSearch)
  - [JSON representation](https://ai.google.dev/api/generate-content#FileSearch.SCHEMA_REPRESENTATION)
- [GoogleMaps](https://ai.google.dev/api/generate-content#GoogleMaps)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleMaps.SCHEMA_REPRESENTATION)
- [Usage](https://ai.google.dev/api/generate-content#Usage)
  - [JSON representation](https://ai.google.dev/api/generate-content#Usage.SCHEMA_REPRESENTATION)
- [ModalityTokens](https://ai.google.dev/api/generate-content#ModalityTokens)
  - [JSON representation](https://ai.google.dev/api/generate-content#ModalityTokens.SCHEMA_REPRESENTATION)
- [GroundingToolCount](https://ai.google.dev/api/generate-content#GroundingToolCount)
  - [JSON representation](https://ai.google.dev/api/generate-content#GroundingToolCount.SCHEMA_REPRESENTATION)
- [WebhookConfig](https://ai.google.dev/api/generate-content#WebhookConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#WebhookConfig.SCHEMA_REPRESENTATION)
- [SafetySetting](https://ai.google.dev/api/generate-content#SafetySetting)
  - [JSON representation](https://ai.google.dev/api/generate-content#SafetySetting.SCHEMA_REPRESENTATION)

Configuration parameters for creating an interaction.
Fields `stream` `boolean` Input only. Whether the interaction will be streamed.
`store` `boolean` Input only. Whether to store the response and request for later retrieval.
`interaction` ``object (`https://ai.google.dev/api/generate-content#Interaction`)`` The interaction to create.
`background` `boolean` Input only. Whether to run the model interaction in the background.

| JSON representation |
|---|
| ``` { "stream": boolean, "store": boolean, "interaction": { object (`https://ai.google.dev/api/generate-content#Interaction`) }, "background": boolean } ``` |

## Interaction

Response for InteractionService.CreateInteraction.
Fields `id` `string` Required. Output only. A unique identifier for the interaction completion.
`status` ``enum (`https://ai.google.dev/api/files#v1beta.Status`)`` Required. Output only. The status of the interaction.
`created` `string` Required. Output only. The time at which the response was created in ISO 8601 format (YYYY-MM-DDThh:mm:ssZ).
`updated` `string` Required. Output only. The time at which the response was last updated in ISO 8601 format (YYYY-MM-DDThh:mm:ssZ).
`role
(deprecated)` `string`

> [!WARNING]
> This item is deprecated!

Output only. The role of the interaction.
`outputs[]
(deprecated)` ``object (`https://ai.google.dev/api/generate-content#v1beta.Content`)``

> [!WARNING]
> This item is deprecated!

Output only. Responses from the model.
`systemInstruction` `string` System instruction for the interaction.
`tools[]` ``object (`https://ai.google.dev/api/generate-content#Tool`)`` A list of tool declarations the model may call during interaction.
`usage` ``object (`https://ai.google.dev/api/generate-content#Usage`)`` Output only. Statistics on the interaction request's token usage.
`responseModalities[]
(deprecated)` ``enum (`https://ai.google.dev/api/generate-content#v1beta.ResponseModality`)``

> [!WARNING]
> This item is deprecated!

The requested modalities of the response (TEXT, IMAGE, AUDIO).
`responseMimeType
(deprecated)` `string`

> [!WARNING]
> This item is deprecated!

The mime type of the response. This is required if responseFormat is set.
`previousInteractionId` `string` The ID of the previous interaction, if any.
`environmentId` `string` Output only. The environment ID for the interaction. Only populated if environment config is set in the request.
`serviceTier` ``enum (`https://ai.google.dev/api/generate-content#v1beta.ServiceTier`)`` The service tier for the interaction.
`webhookConfig` ``object (`https://ai.google.dev/api/generate-content#WebhookConfig`)`` Optional. Webhook configuration for receiving notifications when the interaction completes.
`steps[]` ``object (`https://ai.google.dev/api/generate-content#Step`)`` Required. Output only. The steps that make up the interaction.
`input` `Union type` The input for the interaction. `input` can be only one of the following: `contentList
(deprecated)` ``object (`https://ai.google.dev/api/generate-content#v1beta.ContentList`)``

> [!WARNING]
> This item is deprecated!

The inputs for the interaction.
`stringContent` `string` A string input for the interaction, it will be processed as a single text input.
`turnList
(deprecated)` ``object (`https://ai.google.dev/api/generate-content#TurnList`)``

> [!WARNING]
> This item is deprecated!

The turns for the interaction.
`stepList` ``object (`https://ai.google.dev/api/generate-content#StepList`)`` Input only. The steps for the interaction.
`content` ``object (`https://ai.google.dev/api/generate-content#v1beta.Content`)`` The content for the interaction.
`response_format_config` `Union type` `response_format_config` can be only one of the following: `responseFormat
(deprecated)` ``object (`https://ai.google.dev/api/generate-content#v1beta.Value`)``

> [!WARNING]
> This item is deprecated!

Enforces that the generated response is a JSON object that complies with the JSON schema specified in this field.
`responseFormatList` ``object (`https://ai.google.dev/api/generate-content#ResponseFormatList`)`` `responseFormatSingleton` ``object (`https://ai.google.dev/api/generate-content#ResponseFormat`)`` `request_type` `Union type` The request type for the interaction. `request_type` can be only one of the following: `modelInteraction` ``object (`https://ai.google.dev/api/generate-content#ModelInteraction`)`` Interaction for generating the completion using models.
`agentInteraction` ``object (`AgentInteraction`)`` Interaction for generating the completion using agents.
`environment` `Union type` The environment configuration for the interaction. `environment` can be only one of the following: `envId` `string` The environment ID for the interaction. Can be 'remote' for default environment.
`remoteEnvironment` ``object (`https://ai.google.dev/api/generate-content#EnvironmentConfig`)`` `localEnvironment` ``object (`https://ai.google.dev/api/generate-content#LocalEnvironmentConfig`)`` The agent's environment lives on the client connection: its built-in environment operations (filesystem ops and running commands) are yielded to the client to execute, instead of running in a server-managed sandbox. Mutually exclusive with `remoteEnvironment`. (Independent of any client-declared function tools, which are always executed on the client regardless of this field.)

| JSON representation |
|---|
| ``` { "id": string, "status": enum (`https://ai.google.dev/api/files#v1beta.Status`), "created": string, "updated": string, "role": string, "outputs": [ { object (`https://ai.google.dev/api/generate-content#v1beta.Content`) } ], "systemInstruction": string, "tools": [ { object (`https://ai.google.dev/api/generate-content#Tool`) } ], "usage": { object (`https://ai.google.dev/api/generate-content#Usage`) }, "responseModalities": [ enum (`https://ai.google.dev/api/generate-content#v1beta.ResponseModality`) ], "responseMimeType": string, "previousInteractionId": string, "environmentId": string, "serviceTier": enum (`https://ai.google.dev/api/generate-content#v1beta.ServiceTier`), "webhookConfig": { object (`https://ai.google.dev/api/generate-content#WebhookConfig`) }, "steps": [ { object (`https://ai.google.dev/api/generate-content#Step`) } ], // input "contentList": { object (`https://ai.google.dev/api/generate-content#v1beta.ContentList`) }, "stringContent": string, "turnList": { object (`https://ai.google.dev/api/generate-content#TurnList`) }, "stepList": { object (`https://ai.google.dev/api/generate-content#StepList`) }, "content": { object (`https://ai.google.dev/api/generate-content#v1beta.Content`) } // Union type // response_format_config "responseFormat": { object (`https://ai.google.dev/api/generate-content#v1beta.Value`) }, "responseFormatList": { object (`https://ai.google.dev/api/generate-content#ResponseFormatList`) }, "responseFormatSingleton": { object (`https://ai.google.dev/api/generate-content#ResponseFormat`) } // Union type // request_type "modelInteraction": { object (`https://ai.google.dev/api/generate-content#ModelInteraction`) }, "agentInteraction": { object (`AgentInteraction`) } // Union type // environment "envId": string, "remoteEnvironment": { object (`https://ai.google.dev/api/generate-content#EnvironmentConfig`) }, "localEnvironment": { object (`https://ai.google.dev/api/generate-content#LocalEnvironmentConfig`) } // Union type } ``` |

## TurnList

> [!WARNING]
> This item is deprecated!

A list of Turns.
Fields `turns[]` ``object (`https://ai.google.dev/api/generate-content#Turn`)``

| JSON representation |
|---|
| ``` { "turns": [ { object (`https://ai.google.dev/api/generate-content#Turn`) } ] } ``` |

## Turn

> [!WARNING]
> This item is deprecated!

Fields `role` `string` The originator of this turn. Must be user for input or model for model output.
`content` `Union type` `content` can be only one of the following: `contentList` ``object (`https://ai.google.dev/api/generate-content#v1beta.ContentList`)`` The content of the turn. An array of Content objects.
`contentString` `string` The content of the turn. A single string.

| JSON representation |
|---|
| ``` { "role": string, // content "contentList": { object (`https://ai.google.dev/api/generate-content#v1beta.ContentList`) }, "contentString": string // Union type } ``` |

## StepList

A list of Steps.
Fields `steps[]` ``object (`https://ai.google.dev/api/generate-content#Step`)`` The steps of the list.

| JSON representation |
|---|
| ``` { "steps": [ { object (`https://ai.google.dev/api/generate-content#Step`) } ] } ``` |

## Step

A step in the interaction.
Fields `type` `Union type` `type` can be only one of the following: `thought` ``object (`https://ai.google.dev/api/generate-content#ThoughtStep`)`` `toolCall` ``object (`https://ai.google.dev/api/generate-content#ToolCallStep`)`` `toolResult` ``object (`https://ai.google.dev/api/generate-content#ToolResultStep`)`` `userInput` ``object (`https://ai.google.dev/api/generate-content#UserInputStep`)`` DO NOT USE -- These are for 3P JSON only
`modelOutput` ``object (`https://ai.google.dev/api/generate-content#ModelOutputStep`)`` `text
(deprecated)` ``object (`LegacyTextContent`)``

> [!WARNING]
> This item is deprecated!

`image
(deprecated)` ``object (`LegacyImageContent`)``

> [!WARNING]
> This item is deprecated!

`audio
(deprecated)` ``object (`LegacyAudioContent`)``

> [!WARNING]
> This item is deprecated!

`document
(deprecated)` ``object (`LegacyDocumentContent`)``

> [!WARNING]
> This item is deprecated!

`video
(deprecated)` ``object (`LegacyVideoContent`)``

> [!WARNING]
> This item is deprecated!

| JSON representation |
|---|
| ``` { // type "thought": { object (`https://ai.google.dev/api/generate-content#ThoughtStep`) }, "toolCall": { object (`https://ai.google.dev/api/generate-content#ToolCallStep`) }, "toolResult": { object (`https://ai.google.dev/api/generate-content#ToolResultStep`) }, "userInput": { object (`https://ai.google.dev/api/generate-content#UserInputStep`) }, "modelOutput": { object (`https://ai.google.dev/api/generate-content#ModelOutputStep`) }, "text": { object (`LegacyTextContent`) }, "image": { object (`LegacyImageContent`) }, "audio": { object (`LegacyAudioContent`) }, "document": { object (`LegacyDocumentContent`) }, "video": { object (`LegacyVideoContent`) } // Union type } ``` |

## ThoughtStep

A thought step.
Fields `signature` `string (https://developers.google.com/discovery/v1/type-format format)` A signature hash for backend validation.

A base64-encoded string.
`summary[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.Content`)`` A summary of the thought.

| JSON representation |
|---|
| ``` { "signature": string, "summary": [ { object (`https://ai.google.dev/api/generate-content#v1beta.Content`) } ] } ``` |

## ToolCallStep

Tool call step.
Fields `id` `string` Required. A unique ID for this specific tool call.
`signature` `string (https://developers.google.com/discovery/v1/type-format format)` A signature hash for backend validation.

A base64-encoded string.
`type` `Union type` `type` can be only one of the following: `functionCall` ``object (`https://ai.google.dev/api/generate-content#FunctionCallStep`)`` `codeExecutionCall` ``object (`https://ai.google.dev/api/generate-content#v1beta.CodeExecutionCallStep`)`` `urlContextCall` ``object (`https://ai.google.dev/api/generate-content#UrlContextCallStep`)`` `mcpServerToolCall` ``object (`https://ai.google.dev/api/generate-content#McpServerToolCallStep`)`` `googleSearchCall` ``object (`https://ai.google.dev/api/generate-content#GoogleSearchCallStep`)`` `fileSearchCall` ``object (`https://ai.google.dev/api/generate-content#FileSearchCallStep`)`` `googleMapsCall` ``object (`https://ai.google.dev/api/generate-content#GoogleMapsCallStep`)`` `retrievalCall` ``object (`RetrievalCallStep`)``

| JSON representation |
|---|
| ``` { "id": string, "signature": string, // type "functionCall": { object (`https://ai.google.dev/api/generate-content#FunctionCallStep`) }, "codeExecutionCall": { object (`https://ai.google.dev/api/generate-content#v1beta.CodeExecutionCallStep`) }, "urlContextCall": { object (`https://ai.google.dev/api/generate-content#UrlContextCallStep`) }, "mcpServerToolCall": { object (`https://ai.google.dev/api/generate-content#McpServerToolCallStep`) }, "googleSearchCall": { object (`https://ai.google.dev/api/generate-content#GoogleSearchCallStep`) }, "fileSearchCall": { object (`https://ai.google.dev/api/generate-content#FileSearchCallStep`) }, "googleMapsCall": { object (`https://ai.google.dev/api/generate-content#GoogleMapsCallStep`) }, "retrievalCall": { object (`RetrievalCallStep`) } // Union type } ``` |

## FunctionCallStep

A function tool call step.
Fields `name` `string` Required. The name of the tool to call.
`arguments` ``object (`https://ai.google.dev/api/generate-content#v1beta.Struct`)`` Required. The arguments to pass to the function.

| JSON representation |
|---|
| ``` { "name": string, "arguments": { object (`https://ai.google.dev/api/generate-content#v1beta.Struct`) } } ``` |

## UrlContextCallStep

URL context call step.
Fields `arguments` ``object (`https://ai.google.dev/api/generate-content#UrlContextCallStepArguments`)`` Required. The arguments to pass to the URL context.

| JSON representation |
|---|
| ``` { "arguments": { object (`https://ai.google.dev/api/generate-content#UrlContextCallStepArguments`) } } ``` |

## UrlContextCallStepArguments

The arguments to pass to the URL context.
Fields `urls[]` `string` The URLs to fetch.

| JSON representation |
|---|
| ``` { "urls": [ string ] } ``` |

## McpServerToolCallStep

MCPServer tool call step.
Fields `name` `string` Required. The name of the tool which was called.
`serverName` `string` Required. The name of the used MCP server.
`arguments` ``object (`https://ai.google.dev/api/generate-content#v1beta.Struct`)`` Required. The JSON object of arguments for the function.

| JSON representation |
|---|
| ``` { "name": string, "serverName": string, "arguments": { object (`https://ai.google.dev/api/generate-content#v1beta.Struct`) } } ``` |

## GoogleSearchCallStep

Google Search call step.
Fields `arguments` ``object (`https://ai.google.dev/api/generate-content#GoogleSearchCallStepArguments`)`` Required. The arguments to pass to Google Search.
`searchType` ``enum (`https://ai.google.dev/api/generate-content#v1beta.SearchType`)`` The type of search grounding enabled.

| JSON representation |
|---|
| ``` { "arguments": { object (`https://ai.google.dev/api/generate-content#GoogleSearchCallStepArguments`) }, "searchType": enum (`https://ai.google.dev/api/generate-content#v1beta.SearchType`) } ``` |

## GoogleSearchCallStepArguments

The arguments to pass to Google Search.
Fields `queries[]` `string` Web search queries for the following-up web search.

| JSON representation |
|---|
| ``` { "queries": [ string ] } ``` |

## FileSearchCallStep

This type has no fields.
File Search call step.

## GoogleMapsCallStep

Google Maps call step.
Fields `arguments` ``object (`https://ai.google.dev/api/generate-content#GoogleMapsCallStepArguments`)`` The arguments to pass to the Google Maps tool.

| JSON representation |
|---|
| ``` { "arguments": { object (`https://ai.google.dev/api/generate-content#GoogleMapsCallStepArguments`) } } ``` |

## GoogleMapsCallStepArguments

The arguments to pass to the Google Maps tool.
Fields `queries[]` `string` The queries to be executed.

| JSON representation |
|---|
| ``` { "queries": [ string ] } ``` |

## ToolResultStep

Tool result step.
Fields `callId` `string` Required. ID to match the ID from the function call block.
`signature` `string (https://developers.google.com/discovery/v1/type-format format)` A signature hash for backend validation.

A base64-encoded string.
`type` `Union type` `type` can be only one of the following: `functionResult` ``object (`https://ai.google.dev/api/generate-content#FunctionResultStep`)`` `codeExecutionResult` ``object (`https://ai.google.dev/api/generate-content#v1beta.CodeExecutionResultStep`)`` `urlContextResult` ``object (`https://ai.google.dev/api/generate-content#UrlContextResultStep`)`` `googleSearchResult` ``object (`https://ai.google.dev/api/generate-content#GoogleSearchResultStep`)`` `mcpServerToolResult` ``object (`https://ai.google.dev/api/generate-content#McpServerToolResultStep`)`` `fileSearchResult` ``object (`https://ai.google.dev/api/generate-content#FileSearchResultStep`)`` `googleMapsResult` ``object (`https://ai.google.dev/api/generate-content#GoogleMapsResultStep`)`` `retrievalResult` ``object (`RetrievalResultStep`)``

| JSON representation |
|---|
| ``` { "callId": string, "signature": string, // type "functionResult": { object (`https://ai.google.dev/api/generate-content#FunctionResultStep`) }, "codeExecutionResult": { object (`https://ai.google.dev/api/generate-content#v1beta.CodeExecutionResultStep`) }, "urlContextResult": { object (`https://ai.google.dev/api/generate-content#UrlContextResultStep`) }, "googleSearchResult": { object (`https://ai.google.dev/api/generate-content#GoogleSearchResultStep`) }, "mcpServerToolResult": { object (`https://ai.google.dev/api/generate-content#McpServerToolResultStep`) }, "fileSearchResult": { object (`https://ai.google.dev/api/generate-content#FileSearchResultStep`) }, "googleMapsResult": { object (`https://ai.google.dev/api/generate-content#GoogleMapsResultStep`) }, "retrievalResult": { object (`RetrievalResultStep`) } // Union type } ``` |

## FunctionResultStep

Result of a function tool call.
Fields `name` `string` The name of the tool that was called.
`isError` `boolean` Whether the tool call resulted in an error.
`result` ``object (`https://ai.google.dev/api/generate-content#v1beta.Value`)`` Required. The result of the tool call.

| JSON representation |
|---|
| ``` { "name": string, "isError": boolean, "result": { object (`https://ai.google.dev/api/generate-content#v1beta.Value`) } } ``` |

## UrlContextResultStep

URL context result step.
Fields `result[]` ``object (`https://ai.google.dev/api/generate-content#UrlContextResultItem`)`` Required. The results of the URL context.
`isError` `boolean` Whether the URL context resulted in an error.

| JSON representation |
|---|
| ``` { "result": [ { object (`https://ai.google.dev/api/generate-content#UrlContextResultItem`) } ], "isError": boolean } ``` |

## UrlContextResultItem

The result of the URL context.
Fields `url` `string` The URL that was fetched.
`status` ``enum (`Status`)`` The status of the URL retrieval.

| JSON representation |
|---|
| ``` { "url": string, "status": enum (`Status`) } ``` |

## GoogleSearchResultStep

Google Search result step.
Fields `result[]` ``object (`https://ai.google.dev/api/generate-content#GoogleSearchResultItem`)`` Required. The results of the Google Search.
`isError` `boolean` Whether the Google Search resulted in an error.

| JSON representation |
|---|
| ``` { "result": [ { object (`https://ai.google.dev/api/generate-content#GoogleSearchResultItem`) } ], "isError": boolean } ``` |

## GoogleSearchResultItem

The result of the Google Search.
Fields `searchSuggestions` `string` Web content snippet that can be embedded in a web page or an app webview.

| JSON representation |
|---|
| ``` { "searchSuggestions": string } ``` |

## McpServerToolResultStep

MCPServer tool result step.
Fields `name` `string` Name of the tool which is called for this specific tool call.
`serverName` `string` The name of the used MCP server.
`result` ``object (`https://ai.google.dev/api/generate-content#v1beta.Value`)`` Required. The output from the MCP server call. Can be simple text or rich content.

| JSON representation |
|---|
| ``` { "name": string, "serverName": string, "result": { object (`https://ai.google.dev/api/generate-content#v1beta.Value`) } } ``` |

## FileSearchResultStep

This type has no fields.
File Search result step.

## GoogleMapsResultStep

Google Maps result step.
Fields `result[]` ``object (`https://ai.google.dev/api/generate-content#GoogleMapsResultItem`)``

| JSON representation |
|---|
| ``` { "result": [ { object (`https://ai.google.dev/api/generate-content#GoogleMapsResultItem`) } ] } ``` |

## GoogleMapsResultItem

The result of the Google Maps.
Fields `places[]` ``object (`https://ai.google.dev/api/generate-content#GoogleMapsResultPlaces`)`` `widgetContextToken` `string`

| JSON representation |
|---|
| ``` { "places": [ { object (`https://ai.google.dev/api/generate-content#GoogleMapsResultPlaces`) } ], "widgetContextToken": string } ``` |

## GoogleMapsResultPlaces

Fields `placeId` `string` `name` `string` `url` `string` `reviewSnippets[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.ReviewSnippet`)``

| JSON representation |
|---|
| ``` { "placeId": string, "name": string, "url": string, "reviewSnippets": [ { object (`https://ai.google.dev/api/generate-content#v1beta.ReviewSnippet`) } ] } ``` |

## UserInputStep

Input provided by the user.
Fields `content` `Union type` `content` can be only one of the following: `contentList` ``object (`https://ai.google.dev/api/generate-content#v1beta.ContentList`)`` The content of the step. An array of Content objects.
`contentString` `string` The content of the step. A single string.

| JSON representation |
|---|
| ``` { // content "contentList": { object (`https://ai.google.dev/api/generate-content#v1beta.ContentList`) }, "contentString": string // Union type } ``` |

## ModelOutputStep

Output generated by the model.
Fields `content[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.Content`)``

| JSON representation |
|---|
| ``` { "content": [ { object (`https://ai.google.dev/api/generate-content#v1beta.Content`) } ] } ``` |

## ResponseFormatList

Fields `responseFormats[]` ``object (`https://ai.google.dev/api/generate-content#ResponseFormat`)``

| JSON representation |
|---|
| ``` { "responseFormats": [ { object (`https://ai.google.dev/api/generate-content#ResponseFormat`) } ] } ``` |

## ResponseFormat

Fields `type` `Union type` `type` can be only one of the following: `audio` ``object (`https://ai.google.dev/api/generate-content#v1beta.AudioResponseFormat`)`` `text` ``object (`https://ai.google.dev/api/generate-content#TextResponseFormat`)`` `image` ``object (`https://ai.google.dev/api/generate-content#ImageResponseFormat`)`` `video` ``object (`https://ai.google.dev/api/generate-content#VideoResponseFormat`)`` `structValue` ``object (`https://ai.google.dev/api/generate-content#v1beta.Struct`)`` Multi-discriminator values is already enabled in GAOS

| JSON representation |
|---|
| ``` { // type "audio": { object (`https://ai.google.dev/api/generate-content#v1beta.AudioResponseFormat`) }, "text": { object (`https://ai.google.dev/api/generate-content#TextResponseFormat`) }, "image": { object (`https://ai.google.dev/api/generate-content#ImageResponseFormat`) }, "video": { object (`https://ai.google.dev/api/generate-content#VideoResponseFormat`) }, "structValue": { object (`https://ai.google.dev/api/generate-content#v1beta.Struct`) } // Union type } ``` |

## TextResponseFormat

Configuration for text output format.
Fields `mimeType` ``enum (`MimeType`)`` The MIME type of the text output.
`schema` ``object (`https://ai.google.dev/api/generate-content#v1beta.Struct`)`` The JSON schema that the output should conform to. Only applicable when mimeType is application/json.

| JSON representation |
|---|
| ``` { "mimeType": enum (`MimeType`), "schema": { object (`https://ai.google.dev/api/generate-content#v1beta.Struct`) } } ``` |

## ImageResponseFormat

Configuration for image output format.
Fields `mimeType` ``enum (`MimeType`)`` The MIME type of the image output.
`delivery` ``enum (`Delivery`)`` The delivery mode for the image output.
`aspectRatio` ``enum (`https://ai.google.dev/api/generate-content#v1beta.AspectRatio`)`` The aspect ratio for the image output.
`imageSize` ``enum (`https://ai.google.dev/api/generate-content#v1beta.ImageSize`)`` The size of the image output.

| JSON representation |
|---|
| ``` { "mimeType": enum (`MimeType`), "delivery": enum (`Delivery`), "aspectRatio": enum (`https://ai.google.dev/api/generate-content#v1beta.AspectRatio`), "imageSize": enum (`https://ai.google.dev/api/generate-content#v1beta.ImageSize`) } ``` |

## VideoResponseFormat

Configuration for video output format.
Fields `delivery` ``enum (`Delivery`)`` The delivery mode for the video output.
`aspectRatio` ``enum (`AspectRatio`)`` The aspect ratio for the video output.
`duration` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#duration` format)`` The duration for the video output.

A duration in seconds with up to nine fractional digits, ending with '`s`'. Example: `"3.5s"`.

| JSON representation |
|---|
| ``` { "delivery": enum (`Delivery`), "aspectRatio": enum (`AspectRatio`), "duration": string } ``` |

## ModelInteraction

Interaction for generating the completion using models.
Fields `model` `string` The name of the `Model` used for generating the completion.
`generationConfig` ``object (`https://ai.google.dev/api/generate-content#GenerationConfig`)`` Input only. Configuration parameters for the model interaction.

| JSON representation |
|---|
| ``` { "model": string, "generationConfig": { object (`https://ai.google.dev/api/generate-content#GenerationConfig`) } } ``` |

## GenerationConfig

Configuration parameters for model interactions.
Fields `temperature` `number` Controls the randomness of the output.
`topP` `number` The maximum cumulative probability of tokens to consider when sampling.
`seed` `integer` Seed used in decoding for reproducibility.
`stopSequences[]` `string` A list of character sequences that will stop output interaction.
`thinkingLevel` ``enum (`https://ai.google.dev/api/generate-content#v1beta.ThinkingLevel`)`` The level of thought tokens that the model should generate.
`thinkingSummaries` ``enum (`https://ai.google.dev/api/generate-content#v1beta.ThinkingSummaries`)`` Whether to include thought summaries in the response.
`maxOutputTokens` `integer` The maximum number of tokens to include in the response.
`speechConfig[]` ``object (`https://ai.google.dev/api/generate-content#SpeechConfig`)`` Configuration for speech interaction.
`imageConfig
(deprecated)` ``object (`https://ai.google.dev/api/generate-content#ImageConfig`)``

> [!WARNING]
> This item is deprecated!

Configuration for image interaction.
`videoConfig` ``object (`https://ai.google.dev/api/generate-content#VideoConfig`)`` Configuration for video generation.
`tool_choice` `Union type` The tool choice configuration. `tool_choice` can be only one of the following: `toolChoiceMode` ``enum (`https://ai.google.dev/api/generate-content#v1beta.ToolChoiceType`)`` The mode of the tool choice.
`toolChoiceConfig` ``object (`https://ai.google.dev/api/generate-content#ToolChoiceConfig`)`` The config for the tool choice.

| JSON representation |
|---|
| ``` { "temperature": number, "topP": number, "seed": integer, "stopSequences": [ string ], "thinkingLevel": enum (`https://ai.google.dev/api/generate-content#v1beta.ThinkingLevel`), "thinkingSummaries": enum (`https://ai.google.dev/api/generate-content#v1beta.ThinkingSummaries`), "maxOutputTokens": integer, "speechConfig": [ { object (`https://ai.google.dev/api/generate-content#SpeechConfig`) } ], "imageConfig": { object (`https://ai.google.dev/api/generate-content#ImageConfig`) }, "videoConfig": { object (`https://ai.google.dev/api/generate-content#VideoConfig`) }, // tool_choice "toolChoiceMode": enum (`https://ai.google.dev/api/generate-content#v1beta.ToolChoiceType`), "toolChoiceConfig": { object (`https://ai.google.dev/api/generate-content#ToolChoiceConfig`) } // Union type } ``` |

## ToolChoiceConfig

The tool choice configuration containing allowed tools.
Fields `allowedTools` ``object (`https://ai.google.dev/api/generate-content#v1beta.AllowedTools`)`` The allowed tools.

| JSON representation |
|---|
| ``` { "allowedTools": { object (`https://ai.google.dev/api/generate-content#v1beta.AllowedTools`) } } ``` |

## SpeechConfig

The configuration for speech interaction.
Fields `voice` `string` The voice of the speaker.
`language` `string` The language of the speech.
`speaker` `string` The speaker's name, it should match the speaker name given in the prompt.

| JSON representation |
|---|
| ``` { "voice": string, "language": string, "speaker": string } ``` |

## ImageConfig

The configuration for image interaction.
Fields `aspectRatio` `string` The aspect ratio of the image to generate. Supported aspect ratios: 1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9.

If not specified, the model will choose a default aspect ratio based on any reference images provided.
`imageSize` `string` Specifies the size of generated images. Supported values are `1K`, `2K`, `4K`. If not specified, the model will use default value `1K`.

| JSON representation |
|---|
| ``` { "aspectRatio": string, "imageSize": string } ``` |

## VideoConfig

Configuration options for video generation.
Fields `task` ``enum (`https://ai.google.dev/api/generate-content#v1beta.Task`)`` Optional task mode for video generation. If not specified, the model automatically determines the appropriate mode based on the provided text prompt and input media.

| JSON representation |
|---|
| ``` { "task": enum (`https://ai.google.dev/api/generate-content#v1beta.Task`) } ``` |

## EnvironmentConfig

Configuration for a custom environment.
Fields `sources[]` ``object (`https://ai.google.dev/api/generate-content#Source`)`` `environmentId` `string` Optional. The environment ID for the interaction. If specified, the request will update the existing environment instead of creating a new one.
`network` `Union type` Network configuration for the environment. `network` can be only one of the following: `networkAllowlist` ``object (`https://ai.google.dev/api/generate-content#EnvironmentNetworkEgressAllowlist`)`` Allow only specific domains.
`networkMode` ``enum (`https://ai.google.dev/api/generate-content#v1beta.NetworkMode`)`` Network egress mode.

| JSON representation |
|---|
| ``` { "sources": [ { object (`https://ai.google.dev/api/generate-content#Source`) } ], "environmentId": string, // network "networkAllowlist": { object (`https://ai.google.dev/api/generate-content#EnvironmentNetworkEgressAllowlist`) }, "networkMode": enum (`https://ai.google.dev/api/generate-content#v1beta.NetworkMode`) // Union type } ``` |

## EnvironmentNetworkEgressAllowlist

Network egress configuration for the environment.
Fields `allowlist[]` ``object (`https://ai.google.dev/api/generate-content#EgressRule`)`` List of allowed domains and their configurations.

| JSON representation |
|---|
| ``` { "allowlist": [ { object (`https://ai.google.dev/api/generate-content#EgressRule`) } ] } ``` |

## EgressRule

A network egress rule that controls which external domains the environment is allowed to reach. Each rule identifies a target domain and, optionally, a set of HTTP headers to inject into every matching outbound request.
Fields `domain` `string` The domain pattern to match for this rule. Use an exact hostname (e.g., `github.com`), a wildcard prefix (e.g., `*.googleapis.com`), or `*` to match all domains.
`transform` `map (key: string, value: string)` Headers to inject into requests matching this rule. Key: header name (e.g., "Authorization"). Value: header value (e.g., "Bearer your-token").

An object containing a list of `"key": value` pairs. Example: `{ "name": "wrench", "mass": "1.3kg", "count": "3" }`.

| JSON representation |
|---|
| ``` { "domain": string, "transform": { string: string, ... } } ``` |

## Source

A source to be mounted into the environment.
Fields `type` ``enum (`Type`)`` `source` `string` The source of the environment. For GCS, this is the GCS path. For GitHub, this is the GitHub path.
`target` `string` Where the source should appear in the environment.
`content` `string` The inline content if `type` is `INLINE`.
`encoding` `string` Optional encoding for inline content (e.g. `base64`).

| JSON representation |
|---|
| ``` { "type": enum (`Type`), "source": string, "target": string, "content": string, "encoding": string } ``` |

## LocalEnvironmentConfig

This type has no fields.
Configuration for an environment that lives on the client connection rather than in a server-managed sandbox.

When set (via Interaction.local_environment), the agent's filesystem and shell are treated as living on the client: the agent's built-in environment operations (e.g. reading/listing/editing files and running commands) are suspended on the server and yielded back to the client to execute, with their results returned on a subsequent turn. This is mutually exclusive with a server-managed `EnvironmentConfig` (remoteEnvironment), since the environment is either on the client or in a server sandbox, never both.

This governs only the agent's built-in environment. Client-declared function tools are always executed on the client regardless of this field.

## Tool

A tool that can be used by the model.
Fields `type` `Union type` The tool to use. `type` can be only one of the following: `function` ``object (`https://ai.google.dev/api/generate-content#Function`)`` A function that can be used by the model.
`codeExecution` ``object (`https://ai.google.dev/api/generate-content#v1beta.CodeExecution`)`` A tool that can be used by the model to execute code.
`urlContext` ``object (`https://ai.google.dev/api/generate-content#UrlContext`)`` A tool that can be used by the model to fetch URL context.
`computerUse` ``object (`https://ai.google.dev/api/generate-content#v1beta.ComputerUse`)`` Tool to support the model interacting directly with the computer.
`mcpServer` ``object (`https://ai.google.dev/api/generate-content#McpServer`)`` A MCPServer is a server that can be called by the model to perform actions.
`googleSearch` ``object (`https://ai.google.dev/api/generate-content#GoogleSearch`)`` A tool that can be used by the model to search Google.
`fileSearch` ``object (`https://ai.google.dev/api/generate-content#FileSearch`)`` A tool that can be used by the model to search files.
`googleMaps` ``object (`https://ai.google.dev/api/generate-content#GoogleMaps`)`` A tool that can be used by the model to search Google Maps.
`retrieval` ``object (`Retrieval`)`` A tool that can be used by the model to retrieve files.

| JSON representation |
|---|
| ``` { // type "function": { object (`https://ai.google.dev/api/generate-content#Function`) }, "codeExecution": { object (`https://ai.google.dev/api/generate-content#v1beta.CodeExecution`) }, "urlContext": { object (`https://ai.google.dev/api/generate-content#UrlContext`) }, "computerUse": { object (`https://ai.google.dev/api/generate-content#v1beta.ComputerUse`) }, "mcpServer": { object (`https://ai.google.dev/api/generate-content#McpServer`) }, "googleSearch": { object (`https://ai.google.dev/api/generate-content#GoogleSearch`) }, "fileSearch": { object (`https://ai.google.dev/api/generate-content#FileSearch`) }, "googleMaps": { object (`https://ai.google.dev/api/generate-content#GoogleMaps`) }, "retrieval": { object (`Retrieval`) } // Union type } ``` |

## Function

A tool that can be used by the model.
Fields `name` `string` The name of the function.
`description` `string` A description of the function.
`parameters` ``object (`https://ai.google.dev/api/generate-content#v1beta.Value`)`` The JSON Schema for the function's parameters.

| JSON representation |
|---|
| ``` { "name": string, "description": string, "parameters": { object (`https://ai.google.dev/api/generate-content#v1beta.Value`) } } ``` |

## UrlContext

This type has no fields.
A tool that can be used by the model to fetch URL context.

## McpServer

A MCPServer is a server that can be called by the model to perform actions.
Fields `name` `string` The name of the MCPServer.
`url` `string` The full URL for the MCPServer endpoint. Example: "https://api.example.com/mcp"
`headers` `map (key: string, value: string)` Optional: Fields for authentication headers, timeouts, etc., if needed.

An object containing a list of `"key": value` pairs. Example: `{ "name": "wrench", "mass": "1.3kg", "count": "3" }`.
`allowedTools[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.AllowedTools`)`` The allowed tools.

| JSON representation |
|---|
| ``` { "name": string, "url": string, "headers": { string: string, ... }, "allowedTools": [ { object (`https://ai.google.dev/api/generate-content#v1beta.AllowedTools`) } ] } ``` |

## GoogleSearch

A tool that can be used by the model to search Google.
Fields `searchTypes[]` ``enum (`https://ai.google.dev/api/generate-content#v1beta.SearchType`)`` The types of search grounding to enable.

| JSON representation |
|---|
| ``` { "searchTypes": [ enum (`https://ai.google.dev/api/generate-content#v1beta.SearchType`) ] } ``` |

## FileSearch

A tool that can be used by the model to search files.
Fields `fileSearchStoreNames[]` `string` The file search store names to search.
`topK` `integer` The number of semantic retrieval chunks to retrieve.
`metadataFilter` `string` Metadata filter to apply to the semantic retrieval documents and chunks.

| JSON representation |
|---|
| ``` { "fileSearchStoreNames": [ string ], "topK": integer, "metadataFilter": string } ``` |

## GoogleMaps

A tool that can be used by the model to call Google Maps.
Fields `enableWidget` `boolean` Whether to return a widget context token in the tool call result of the response.
`latitude` `number` The latitude of the user's location.
`longitude` `number` The longitude of the user's location.

| JSON representation |
|---|
| ``` { "enableWidget": boolean, "latitude": number, "longitude": number } ``` |

## Usage

Statistics on the interaction request's token usage.
Fields `totalInputTokens` `integer` Number of tokens in the prompt (context).
`inputTokensByModality[]` ``object (`https://ai.google.dev/api/generate-content#ModalityTokens`)`` A breakdown of input token usage by modality.
`totalCachedTokens` `integer` Number of tokens in the cached part of the prompt (the cached content).
`cachedTokensByModality[]` ``object (`https://ai.google.dev/api/generate-content#ModalityTokens`)`` A breakdown of cached token usage by modality.
`totalOutputTokens` `integer` Total number of tokens across all the generated responses.
`outputTokensByModality[]` ``object (`https://ai.google.dev/api/generate-content#ModalityTokens`)`` A breakdown of output token usage by modality.
`totalToolUseTokens` `integer` Number of tokens present in tool-use prompt(s).
`toolUseTokensByModality[]` ``object (`https://ai.google.dev/api/generate-content#ModalityTokens`)`` A breakdown of tool-use token usage by modality.
`totalThoughtTokens` `integer` Number of tokens of thoughts for thinking models.
`totalTokens` `integer` Total token count for the interaction request (prompt + responses + other internal tokens).
`groundingToolCount[]` ``object (`https://ai.google.dev/api/generate-content#GroundingToolCount`)`` Grounding tool count.

| JSON representation |
|---|
| ``` { "totalInputTokens": integer, "inputTokensByModality": [ { object (`https://ai.google.dev/api/generate-content#ModalityTokens`) } ], "totalCachedTokens": integer, "cachedTokensByModality": [ { object (`https://ai.google.dev/api/generate-content#ModalityTokens`) } ], "totalOutputTokens": integer, "outputTokensByModality": [ { object (`https://ai.google.dev/api/generate-content#ModalityTokens`) } ], "totalToolUseTokens": integer, "toolUseTokensByModality": [ { object (`https://ai.google.dev/api/generate-content#ModalityTokens`) } ], "totalThoughtTokens": integer, "totalTokens": integer, "groundingToolCount": [ { object (`https://ai.google.dev/api/generate-content#GroundingToolCount`) } ] } ``` |

## ModalityTokens

The token count for a single response modality.
Fields `modality` ``enum (`https://ai.google.dev/api/generate-content#v1beta.ResponseModality`)`` The modality associated with the token count.
`tokens` `integer` Number of tokens for the modality.

| JSON representation |
|---|
| ``` { "modality": enum (`https://ai.google.dev/api/generate-content#v1beta.ResponseModality`), "tokens": integer } ``` |

## GroundingToolCount

The number of grounding tool counts.
Fields `type` ``enum (`Type`)`` The grounding tool type associated with the count.
`count` `integer` The number of grounding tool counts.

| JSON representation |
|---|
| ``` { "type": enum (`Type`), "count": integer } ``` |

## WebhookConfig

Message for configuring webhook events for a request.
Fields `uris[]` `string` Optional. If set, these webhook URIs will be used for webhook events instead of the registered webhooks.
`userMetadata` ``object (`https://protobuf.dev/reference/protobuf/google.protobuf#struct` format)`` Optional. The user metadata that will be returned on each event emission to the webhooks.

| JSON representation |
|---|
| ``` { "uris": [ string ], "userMetadata": { object } } ``` |

## SafetySetting

A safety setting that affects the safety-blocking behavior.

A \[SafetySetting\]\[google.cloud.aiplatform.master.SafetySetting\] consists of a harm \[category\]\[google.cloud.aiplatform.master.SafetySetting.category\] and a \[threshold\]\[google.cloud.aiplatform.master.SafetySetting.threshold\] for that category.
Fields `type` ``enum (`https://ai.google.dev/api/generate-content#v1beta.HarmCategory`)`` Required. The type of harm category to be blocked.
`threshold` ``enum (`https://ai.google.dev/api/generate-content#v1beta.HarmBlockThreshold`)`` Required. The threshold for blocking content. If the harm probability exceeds this threshold, the content will be blocked.
`method` ``enum (`https://ai.google.dev/api/generate-content#v1beta.HarmBlockMethod`)`` Optional. The method for blocking content. If not specified, the default behavior is to use the probability score.

| JSON representation |
|---|
| ``` { "type": enum (`https://ai.google.dev/api/generate-content#v1beta.HarmCategory`), "threshold": enum (`https://ai.google.dev/api/generate-content#v1beta.HarmBlockThreshold`), "method": enum (`https://ai.google.dev/api/generate-content#v1beta.HarmBlockMethod`) } ``` |

## Delivery

Delivery mode for audio output.

| Enums ||
|---|---|
| `DELIVERY_UNSPECIFIED` | Default value. This value is unused. |
| `INLINE` | Audio data is returned inline in the response. |
| `URI` | Audio data is returned as a URI. |

## Environment

Represents the environment being operated, such as a web browser.

| Enums ||
|---|---|
| `ENVIRONMENT_UNSPECIFIED` | Defaults to browser. |
| `BROWSER` | Operates in a web browser. |
| `MOBILE` | Operates in a mobile environment. |
| `DESKTOP` | Operates in a desktop environment. |

## HarmBlockMethod

The method for blocking content.

| Enums ||
|---|---|
| `HARM_BLOCK_METHOD_UNSPECIFIED` | The harm block method is unspecified. |
| `SEVERITY` | The harm block method uses both probability and severity scores. |
| `PROBABILITY` | The harm block method uses the probability score. |

## HarmBlockThreshold

Thresholds for blocking content based on harm probability.

| Enums ||
|---|---|
| `HARM_BLOCK_THRESHOLD_UNSPECIFIED` | The harm block threshold is unspecified. |
| `BLOCK_LOW_AND_ABOVE` | Block content with a low harm probability or higher. |
| `BLOCK_MEDIUM_AND_ABOVE` | Block content with a medium harm probability or higher. |
| `BLOCK_ONLY_HIGH` | Block content with a high harm probability. |
| `BLOCK_NONE` | Do not block any content, regardless of its harm probability. |
| `OFF` | Turn off the safety filter entirely. |

## ImageSize

Supported image sizes for image output.

| Enums ||
|---|---|
| `IMAGE_SIZE_UNSPECIFIED` | Default value. This value is unused. |
| `IMAGE_SIZE_FIVE_TWELVE` | 512px image size. |
| `IMAGE_SIZE_ONE_K` | 1K image size. |
| `IMAGE_SIZE_TWO_K` | 2K image size. |
| `IMAGE_SIZE_FOUR_K` | 4K image size. |

## Language

Supported programming languages for the generated code.

| Enums ||
|---|---|
| `LANGUAGE_UNSPECIFIED` | Unspecified language. This value should not be used. |
| `PYTHON` | Python \>= 3.10, with numpy and simpy available. |

## MediaResolution

Resolution for input media (images/video).

| Enums ||
|---|---|
| `MEDIA_RESOLUTION_UNSPECIFIED` | Default value. This value is unused. |
| `LOW` | Low resolution. |
| `MEDIUM` | Medium resolution. |
| `HIGH` | High resolution. |
| `ULTRA_HIGH` | Ultra high resolution. |

## MimeType

| Enums ||
|---|---|
| `TYPE_UNSPECIFIED` |   |
| `TYPE_WAV` | WAV audio format |
| `TYPE_MP3` | MP3 audio format |
| `TYPE_AIFF` | AIFF audio format |
| `TYPE_AAC` | AAC audio format |
| `TYPE_OGG` | OGG audio format |
| `TYPE_FLAC` | FLAC audio format |
| `TYPE_MPEG` | MPEG audio format |
| `TYPE_M4A` | M4A audio format |
| `TYPE_L16` | L16 audio format |
| `TYPE_OPUS` | OPUS audio format |
| `TYPE_ALAW` | ALAW audio format |
| `TYPE_MULAW` | MULAW audio format |

## Mode

Defines the depth and thoroughness of the find session.

| Enums ||
|---|---|
| `MODE_UNSPECIFIED` | Default value. This value is unused. |
| `MODE_SCAN` | Fast scan using only the initial classifier. |
| `MODE_VERIFY` | Performs classification followed by detailed investigation. |

## NetworkMode

Network egress mode for non-allowlist configurations.

| Enums ||
|---|---|
| `NETWORK_MODE_UNSPECIFIED` | Default value. Unused. |
| `DISABLED` | All network egress is blocked. |

## ResponseModality

The modality of the response.

| Enums ||
|---|---|
| `RESPONSE_MODALITY_UNSPECIFIED` | Default value. This value is unused. |
| `TEXT` | Indicates the model should return text. |
| `IMAGE` | Indicates the model should return images. |
| `AUDIO` | Indicates the model should return audio. |
| `VIDEO` | Indicates the model should return video. |
| `DOCUMENT` | Indicates the model should return documents. |

## ReviewSnippet

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)

Encapsulates a snippet of a user review that answers a question about the features of a specific place in Google Maps.
Fields `title` `string` Title of the review.
`url` `string` A link that corresponds to the user review on Google Maps.
`reviewId` `string` The ID of the review snippet.

| JSON representation |
|---|
| ``` { "title": string, "url": string, "reviewId": string } ``` |

## SafetyPolicy

| Enums ||
|---|---|
| `SAFETY_POLICY_UNSPECIFIED` | Unspecified safety policy. |
| `FINANCIAL_TRANSACTIONS` | Safety policy for financial transactions. |
| `SENSITIVE_DATA_MODIFICATION` | Safety policy for sensitive data modification. |
| `COMMUNICATION_TOOL` | Safety policy for communication tools (e.g. Gmail, Chat, Meet). |
| `ACCOUNT_CREATION` | Safety policy for account creation. |
| `DATA_MODIFICATION` | Safety policy for data modification. |
| `USER_CONSENT_MANAGEMENT` | Safety policy for user consent management. |
| `LEGAL_TERMS_AND_AGREEMENTS` | Safety policy for legal terms and agreements. |

## Schema

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [Type](https://ai.google.dev/api/generate-content#Type)

The `Schema` object allows the definition of input and output data types. These types can be objects, but also primitives and arrays. Represents a select subset of an [OpenAPI 3.0 schema object](https://spec.openapis.org/oas/v3.0.3#schema).
Fields `type` ``enum (`https://ai.google.dev/api/generate-content#Type`)`` Required. Data type.
`format` `string` Optional. The format of the data. Any value is allowed, but most do not trigger any special functionality.
`title` `string` Optional. The title of the schema.
`description` `string` Optional. A brief description of the parameter. This could contain examples of use. Parameter description may be formatted as Markdown.
`nullable` `boolean` Optional. Indicates if the value may be null.
`enum[]` `string` Optional. Possible values of the element of Type.STRING with enum format. For example we can define an Enum Direction as : {type:STRING, format:enum, enum:\["EAST", NORTH", "SOUTH", "WEST"\]}
`maxItems` `string (https://developers.google.com/discovery/v1/type-format format)` Optional. Maximum number of the elements for Type.ARRAY.
`minItems` `string (https://developers.google.com/discovery/v1/type-format format)` Optional. Minimum number of the elements for Type.ARRAY.
`properties` ``map (key: string, value: object (`https://ai.google.dev/api/generate-content#v1beta.Schema`))`` Optional. Properties of Type.OBJECT.

An object containing a list of `"key": value` pairs. Example: `{ "name": "wrench", "mass": "1.3kg", "count": "3" }`.
`required[]` `string` Optional. Required properties of Type.OBJECT.
`minProperties` `string (https://developers.google.com/discovery/v1/type-format format)` Optional. Minimum number of the properties for Type.OBJECT.
`maxProperties` `string (https://developers.google.com/discovery/v1/type-format format)` Optional. Maximum number of the properties for Type.OBJECT.
`minLength` `string (https://developers.google.com/discovery/v1/type-format format)` Optional. SCHEMA FIELDS FOR TYPE STRING Minimum length of the Type.STRING
`maxLength` `string (https://developers.google.com/discovery/v1/type-format format)` Optional. Maximum length of the Type.STRING
`pattern` `string` Optional. Pattern of the Type.STRING to restrict a string to a regular expression.
`example` ``value (`https://protobuf.dev/reference/protobuf/google.protobuf#value` format)`` Optional. Example of the object. Will only populated when the object is the root.
`anyOf[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.Schema`)`` Optional. The value should be validated against any (one or more) of the subschemas in the list.
`propertyOrdering[]` `string` Optional. The order of the properties. Not a standard field in open api spec. Used to determine the order of the properties in the response.
`default` ``value (`https://protobuf.dev/reference/protobuf/google.protobuf#value` format)`` Optional. Default value of the field. Per JSON Schema, this field is intended for documentation generators and doesn't affect validation. Thus it's included here and ignored so that developers who send schemas with a `default` field don't get unknown-field errors.
`items` ``object (`https://ai.google.dev/api/generate-content#v1beta.Schema`)`` Optional. Schema of the elements of Type.ARRAY.
`minimum` `number` Optional. SCHEMA FIELDS FOR TYPE INTEGER and NUMBER Minimum value of the Type.INTEGER and Type.NUMBER
`maximum` `number` Optional. Maximum value of the Type.INTEGER and Type.NUMBER

| JSON representation |
|---|
| ``` { "type": enum (`https://ai.google.dev/api/generate-content#Type`), "format": string, "title": string, "description": string, "nullable": boolean, "enum": [ string ], "maxItems": string, "minItems": string, "properties": { string: { object (`https://ai.google.dev/api/generate-content#v1beta.Schema`) }, ... }, "required": [ string ], "minProperties": string, "maxProperties": string, "minLength": string, "maxLength": string, "pattern": string, "example": value, "anyOf": [ { object (`https://ai.google.dev/api/generate-content#v1beta.Schema`) } ], "propertyOrdering": [ string ], "default": value, "items": { object (`https://ai.google.dev/api/generate-content#v1beta.Schema`) }, "minimum": number, "maximum": number } ``` |

## Type

Type contains the list of OpenAPI data types as defined by <https://spec.openapis.org/oas/v3.0.3#data-types>

| Enums ||
|---|---|
| `TYPE_UNSPECIFIED` | Not specified, should not be used. |
| `STRING` | String type. |
| `NUMBER` | Number type. |
| `INTEGER` | Integer type. |
| `BOOLEAN` | Boolean type. |
| `ARRAY` | Array type. |
| `OBJECT` | Object type. |
| `NULL` | Null type. |

## SearchType

The types of search grounding to enable.

| Enums ||
|---|---|
| `SEARCH_TYPE_UNSPECIFIED` | Unspecified search type. This value should not be used. |
| `SEARCH_TYPE_WEB_SEARCH` | Setting this field enables web search. Only text results are returned. |
| `SEARCH_TYPE_IMAGE_SEARCH` | Setting this field enables image search. Image bytes are returned. |

## Struct

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [Field](https://ai.google.dev/api/generate-content#Field)
  - [JSON representation](https://ai.google.dev/api/generate-content#Field.SCHEMA_REPRESENTATION)

`Struct` represents a structured data value, consisting of fields which map to dynamically typed values.
Fields `fields[]` ``object (`https://ai.google.dev/api/generate-content#Field`)`` Dynamically typed fields. List instead of map because LLMs are sensitive to ordering, and we want to give users full control.

| JSON representation |
|---|
| ``` { "fields": [ { object (`https://ai.google.dev/api/generate-content#Field`) } ] } ``` |

## Field

Represents a single field in a struct.
Fields `name` `string` `value` ``object (`https://ai.google.dev/api/generate-content#v1beta.Value`)``

| JSON representation |
|---|
| ``` { "name": string, "value": { object (`https://ai.google.dev/api/generate-content#v1beta.Value`) } } ``` |

## Task

Supported video generation tasks.

| Enums ||
|---|---|
| `TASK_UNSPECIFIED` | Unspecified task. The task is inferred from the input prompt and media. |
| `TEXT_TO_VIDEO` | Generates video solely from a text prompt. |
| `IMAGE_TO_VIDEO` | Generates video from one or two source images. The first image defines the starting frame, and the optional second image defines the ending frame. |
| `REFERENCE_TO_VIDEO` | Generates video using reference media (such as images, audio, or video). |
| `EDIT` | Modifies an existing input video. |

## ThinkingLevel

The level of thought tokens that the model should generate.

| Enums ||
|---|---|
| `THINKING_LEVEL_UNSPECIFIED` | Default value. This value is unused. |
| `THINKING_LEVEL_MINIMAL` | Little to no thinking. |
| `THINKING_LEVEL_LOW` | Low thinking level. |
| `THINKING_LEVEL_MEDIUM` | Medium thinking level. |
| `THINKING_LEVEL_HIGH` | High thinking level. |

## ThinkingSummaries

Whether to include thought summaries in the response.

| Enums ||
|---|---|
| `THINKING_SUMMARIES_UNSPECIFIED` | Default value. This value is unused. |
| `THINKING_SUMMARIES_AUTO` | Auto thinking summaries. |
| `THINKING_SUMMARIES_NONE` | No thinking summaries. |

## Tool

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [FunctionDeclaration](https://ai.google.dev/api/generate-content#FunctionDeclaration)
  - [JSON representation](https://ai.google.dev/api/generate-content#FunctionDeclaration.SCHEMA_REPRESENTATION)
- [Behavior](https://ai.google.dev/api/generate-content#Behavior)
- [GoogleSearchRetrieval](https://ai.google.dev/api/generate-content#GoogleSearchRetrieval)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleSearchRetrieval.SCHEMA_REPRESENTATION)
- [DynamicRetrievalConfig](https://ai.google.dev/api/generate-content#DynamicRetrievalConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#DynamicRetrievalConfig.SCHEMA_REPRESENTATION)
- [Mode](https://ai.google.dev/api/generate-content#Mode)
- [CodeExecution](https://ai.google.dev/api/generate-content#CodeExecution)
- [GoogleSearch](https://ai.google.dev/api/generate-content#GoogleSearch)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleSearch.SCHEMA_REPRESENTATION)
- [Interval](https://ai.google.dev/api/generate-content#Interval)
  - [JSON representation](https://ai.google.dev/api/generate-content#Interval.SCHEMA_REPRESENTATION)
- [SearchTypes](https://ai.google.dev/api/generate-content#SearchTypes)
  - [JSON representation](https://ai.google.dev/api/generate-content#SearchTypes.SCHEMA_REPRESENTATION)
- [WebSearch](https://ai.google.dev/api/generate-content#WebSearch)
- [ImageSearch](https://ai.google.dev/api/generate-content#ImageSearch)
- [ComputerUse](https://ai.google.dev/api/generate-content#ComputerUse)
  - [JSON representation](https://ai.google.dev/api/generate-content#ComputerUse.SCHEMA_REPRESENTATION)
- [Environment](https://ai.google.dev/api/generate-content#Environment)
- [SafetyPolicy](https://ai.google.dev/api/generate-content#SafetyPolicy)
- [UrlContext](https://ai.google.dev/api/generate-content#UrlContext)
- [FileSearch](https://ai.google.dev/api/generate-content#FileSearch)
  - [JSON representation](https://ai.google.dev/api/generate-content#FileSearch.SCHEMA_REPRESENTATION)
- [McpServer](https://ai.google.dev/api/generate-content#McpServer)
  - [JSON representation](https://ai.google.dev/api/generate-content#McpServer.SCHEMA_REPRESENTATION)
- [StreamableHttpTransport](https://ai.google.dev/api/generate-content#StreamableHttpTransport)
  - [JSON representation](https://ai.google.dev/api/generate-content#StreamableHttpTransport.SCHEMA_REPRESENTATION)
- [GoogleMaps](https://ai.google.dev/api/generate-content#GoogleMaps)
  - [JSON representation](https://ai.google.dev/api/generate-content#GoogleMaps.SCHEMA_REPRESENTATION)

Tool details that the model may use to generate response.

A `Tool` is a piece of code that enables the system to interact with external systems to perform an action, or set of actions, outside of knowledge and scope of the model.

Next ID: 16
Fields `functionDeclarations[]` ``object (`https://ai.google.dev/api/generate-content#FunctionDeclaration`)`` Optional. A list of `FunctionDeclarations` available to the model that can be used for function calling.

The model or system does not execute the function. Instead the defined function may be returned as a `FunctionCall` with arguments to the client side for execution. The model may decide to call a subset of these functions by populating `FunctionCall` in the response. The next conversation turn may contain a `FunctionResponse` with the `Content.role` "function" generation context for the next model turn.
`googleSearchRetrieval` ``object (`https://ai.google.dev/api/generate-content#GoogleSearchRetrieval`)`` Optional. Retrieval tool that is powered by Google search.
`codeExecution` ``object (`https://ai.google.dev/api/generate-content#CodeExecution`)`` Optional. Enables the model to execute code as part of generation.
`googleSearch` ``object (`https://ai.google.dev/api/generate-content#GoogleSearch`)`` Optional. GoogleSearch tool type. Tool to support Google Search in Model. Powered by Google.
`computerUse` ``object (`https://ai.google.dev/api/generate-content#ComputerUse`)`` Optional. Tool to support the model interacting directly with the computer. If enabled, it automatically populates computer-use specific Function Declarations.
`urlContext` ``object (`https://ai.google.dev/api/generate-content#UrlContext`)`` Optional. Tool to support URL context retrieval.
`fileSearch` ``object (`https://ai.google.dev/api/generate-content#FileSearch`)`` Optional. FileSearch tool type. Tool to retrieve knowledge from Semantic Retrieval corpora.
`mcpServers[]` ``object (`https://ai.google.dev/api/generate-content#McpServer`)`` Optional. MCP Servers to connect to.
`googleMaps` ``object (`https://ai.google.dev/api/generate-content#GoogleMaps`)`` Optional. Tool that allows grounding the model's response with geospatial context related to the user's query.

| JSON representation |
|---|
| ``` { "functionDeclarations": [ { object (`https://ai.google.dev/api/generate-content#FunctionDeclaration`) } ], "googleSearchRetrieval": { object (`https://ai.google.dev/api/generate-content#GoogleSearchRetrieval`) }, "codeExecution": { object (`https://ai.google.dev/api/generate-content#CodeExecution`) }, "googleSearch": { object (`https://ai.google.dev/api/generate-content#GoogleSearch`) }, "computerUse": { object (`https://ai.google.dev/api/generate-content#ComputerUse`) }, "urlContext": { object (`https://ai.google.dev/api/generate-content#UrlContext`) }, "fileSearch": { object (`https://ai.google.dev/api/generate-content#FileSearch`) }, "mcpServers": [ { object (`https://ai.google.dev/api/generate-content#McpServer`) } ], "googleMaps": { object (`https://ai.google.dev/api/generate-content#GoogleMaps`) } } ``` |

## FunctionDeclaration

Structured representation of a function declaration as defined by the [OpenAPI 3.03 specification](https://spec.openapis.org/oas/v3.0.3). Included in this declaration are the function name and parameters. This FunctionDeclaration is a representation of a block of code that can be used as a `Tool` by the model and executed by the client.
Fields `name` `string` Required. The name of the function. Must be a-z, A-Z, 0-9, or contain underscores, colons, dots, and dashes, with a maximum length of 128.
`description` `string` Required. A brief description of the function.
`behavior` ``enum (`https://ai.google.dev/api/generate-content#Behavior`)`` Optional. Specifies the function Behavior. Currently only supported by the BidiGenerateContent method.
`parameters` ``object (`https://ai.google.dev/api/generate-content#v1beta.Schema`)`` Optional. Describes the parameters to this function. Reflects the Open API 3.03 Parameter Object string Key: the name of the parameter. Parameter names are case sensitive. Schema Value: the Schema defining the type used for the parameter.
`parametersJsonSchema` ``value (`https://protobuf.dev/reference/protobuf/google.protobuf#value` format)`` Optional. Describes the parameters to the function in JSON Schema format. The schema must describe an object where the properties are the parameters to the function. For example:

    {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "age": { "type": "integer" }
      },
      "additionalProperties": false,
      "required": ["name", "age"],
      "propertyOrdering": ["name", "age"]
    }

This field is mutually exclusive with `parameters`.
`response` ``object (`https://ai.google.dev/api/generate-content#v1beta.Schema`)`` Optional. Describes the output from this function in JSON Schema format. Reflects the Open API 3.03 Response Object. The Schema defines the type used for the response value of the function.
`responseJsonSchema` ``value (`https://protobuf.dev/reference/protobuf/google.protobuf#value` format)`` Optional. Describes the output from this function in JSON Schema format. The value specified by the schema is the response value of the function.

This field is mutually exclusive with `response`.

| JSON representation |
|---|
| ``` { "name": string, "description": string, "behavior": enum (`https://ai.google.dev/api/generate-content#Behavior`), "parameters": { object (`https://ai.google.dev/api/generate-content#v1beta.Schema`) }, "parametersJsonSchema": value, "response": { object (`https://ai.google.dev/api/generate-content#v1beta.Schema`) }, "responseJsonSchema": value } ``` |

## Behavior

Defines the function behavior. Defaults to `BLOCKING`.

| Enums ||
|---|---|
| `UNSPECIFIED` | This value is unused. |
| `BLOCKING` | If set, the system will wait to receive the function response before continuing the conversation. |
| `NON_BLOCKING` | If set, the system will not wait to receive the function response. Instead, it will attempt to handle function responses as they become available while maintaining the conversation between the user and the model. |

## GoogleSearchRetrieval

Tool to retrieve public web data for grounding, powered by Google.
Fields `dynamicRetrievalConfig` ``object (`https://ai.google.dev/api/generate-content#DynamicRetrievalConfig`)`` Specifies the dynamic retrieval configuration for the given source.

| JSON representation |
|---|
| ``` { "dynamicRetrievalConfig": { object (`https://ai.google.dev/api/generate-content#DynamicRetrievalConfig`) } } ``` |

## DynamicRetrievalConfig

Describes the options to customize dynamic retrieval.
Fields `mode` ``enum (`https://ai.google.dev/api/generate-content#Mode`)`` The mode of the predictor to be used in dynamic retrieval.
`dynamicThreshold` `number` The threshold to be used in dynamic retrieval. If not set, a system default value is used.

| JSON representation |
|---|
| ``` { "mode": enum (`https://ai.google.dev/api/generate-content#Mode`), "dynamicThreshold": number } ``` |

## Mode

The mode of the predictor to be used in dynamic retrieval.

| Enums ||
|---|---|
| `MODE_UNSPECIFIED` | Always trigger retrieval. |
| `MODE_DYNAMIC` | Run retrieval only when system decides it is necessary. |

## CodeExecution

This type has no fields.
Tool that executes code generated by the model, and automatically returns the result to the model.

See also `ExecutableCode` and `CodeExecutionResult` which are only generated when using this tool.

## GoogleSearch

GoogleSearch tool type. Tool to support Google Search in Model. Powered by Google.
Fields `timeRangeFilter` ``object (`https://ai.google.dev/api/generate-content#Interval`)`` Optional. Filter search results to a specific time range. If customers set a start time, they must set an end time (and vice versa).
`searchTypes` ``object (`https://ai.google.dev/api/generate-content#SearchTypes`)`` Optional. The set of search types to enable. If not set, web search is enabled by default.

| JSON representation |
|---|
| ``` { "timeRangeFilter": { object (`https://ai.google.dev/api/generate-content#Interval`) }, "searchTypes": { object (`https://ai.google.dev/api/generate-content#SearchTypes`) } } ``` |

## Interval

Represents a time interval, encoded as a Timestamp start (inclusive) and a Timestamp end (exclusive).

The start must be less than or equal to the end. When the start equals the end, the interval is empty (matches no time). When both start and end are unspecified, the interval matches any time.
Fields `startTime` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#timestamp` format)`` Optional. Inclusive start of the interval.

If specified, a Timestamp matching this interval will have to be the same or after the start.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: `"2014-10-02T15:01:23Z"`, `"2014-10-02T15:01:23.045123456Z"` or `"2014-10-02T15:01:23+05:30"`.
`endTime` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#timestamp` format)`` Optional. Exclusive end of the interval.

If specified, a Timestamp matching this interval will have to be before the end.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: `"2014-10-02T15:01:23Z"`, `"2014-10-02T15:01:23.045123456Z"` or `"2014-10-02T15:01:23+05:30"`.

| JSON representation |
|---|
| ``` { "startTime": string, "endTime": string } ``` |

## SearchTypes

Different types of search that can be enabled on the GoogleSearch tool.
Fields `webSearch` ``object (`https://ai.google.dev/api/generate-content#WebSearch`)`` Optional. Enables web search. Only text results are returned.
`imageSearch` ``object (`https://ai.google.dev/api/generate-content#ImageSearch`)`` Optional. Enables image search. Image bytes are returned.

| JSON representation |
|---|
| ``` { "webSearch": { object (`https://ai.google.dev/api/generate-content#WebSearch`) }, "imageSearch": { object (`https://ai.google.dev/api/generate-content#ImageSearch`) } } ``` |

## WebSearch

This type has no fields.
Standard web search for grounding and related configurations.

## ImageSearch

This type has no fields.
Image search for grounding and related configurations.

## ComputerUse

Computer Use tool type.
Fields `environment` ``enum (`https://ai.google.dev/api/generate-content#Environment`)`` Required. The environment being operated.
`excludedPredefinedFunctions[]` `string` Optional. By default, predefined functions are included in the final model call. Some of them can be explicitly excluded from being automatically included. This can serve two purposes: 1. Using a more restricted / different action space. 2. Improving the definitions / instructions of predefined functions.
`enablePromptInjectionDetection` `boolean` Optional. Whether enable the prompt injection detection check on computer-use request.
`disabledSafetyPolicies[]` ``enum (`https://ai.google.dev/api/generate-content#SafetyPolicy`)`` Optional. Disabled safety policies for computer use.

| JSON representation |
|---|
| ``` { "environment": enum (`https://ai.google.dev/api/generate-content#Environment`), "excludedPredefinedFunctions": [ string ], "enablePromptInjectionDetection": boolean, "disabledSafetyPolicies": [ enum (`https://ai.google.dev/api/generate-content#SafetyPolicy`) ] } ``` |

## Environment

Represents the environment being operated, such as a web browser.

| Enums ||
|---|---|
| `ENVIRONMENT_UNSPECIFIED` | Defaults to browser. |
| `ENVIRONMENT_BROWSER` | Operates in a web browser. |
| `ENVIRONMENT_MOBILE` | Operates in a mobile environment. |
| `ENVIRONMENT_DESKTOP` | Operates in a desktop environment. |

## SafetyPolicy

Predefined safety policies for computer use.

| Enums ||
|---|---|
| `SAFETY_POLICY_UNSPECIFIED` | Unspecified safety policy. |
| `FINANCIAL_TRANSACTIONS` | Safety policy for financial transactions. |
| `SENSITIVE_DATA_MODIFICATION` | Safety policy for sensitive data modification. |
| `COMMUNICATION_TOOL` | Safety policy for communication tools (e.g. Gmail, Chat, Meet). |
| `ACCOUNT_CREATION` | Safety policy for account creation. |
| `DATA_MODIFICATION` | Safety policy for data modification. |
| `USER_CONSENT_MANAGEMENT` | Safety policy for user consent management. |
| `LEGAL_TERMS_AND_AGREEMENTS` | Safety policy for legal terms and agreements. |

## UrlContext

This type has no fields.
Tool to support URL context retrieval.

## FileSearch

The FileSearch tool that retrieves knowledge from Semantic Retrieval corpora. Files are imported to Semantic Retrieval corpora using the ImportFile API.
Fields `fileSearchStoreNames[]` `string` Required. The names of the fileSearchStores to retrieve from. Example: `fileSearchStores/my-file-search-store-123`
`metadataFilter` `string` Optional. Metadata filter to apply to the semantic retrieval documents and chunks.
`topK` `integer` Optional. The number of semantic retrieval chunks to retrieve.

| JSON representation |
|---|
| ``` { "fileSearchStoreNames": [ string ], "metadataFilter": string, "topK": integer } ``` |

## McpServer

A MCPServer is a server that can be called by the model to perform actions. It is a server that implements the MCP protocol. Next ID: 6
Fields `name` `string` The name of the MCPServer.
`transport` `Union type` The transport to use to connect to the MCPServer. `transport` can be only one of the following: `streamableHttpTransport` ``object (`https://ai.google.dev/api/generate-content#StreamableHttpTransport`)`` A transport that can stream HTTP requests and responses.

| JSON representation |
|---|
| ``` { "name": string, // transport "streamableHttpTransport": { object (`https://ai.google.dev/api/generate-content#StreamableHttpTransport`) } // Union type } ``` |

## StreamableHttpTransport

A transport that can stream HTTP requests and responses. Next ID: 6
Fields `url` `string` The full URL for the MCPServer endpoint. Example: "https://api.example.com/mcp"
`headers` `map (key: string, value: string)` Optional: Fields for authentication headers, timeouts, etc., if needed.

An object containing a list of `"key": value` pairs. Example: `{ "name": "wrench", "mass": "1.3kg", "count": "3" }`.
`timeout` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#duration` format)`` HTTP timeout for regular operations.

A duration in seconds with up to nine fractional digits, ending with '`s`'. Example: `"3.5s"`.
`sseReadTimeout` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#duration` format)`` Timeout for SSE read operations.

A duration in seconds with up to nine fractional digits, ending with '`s`'. Example: `"3.5s"`.
`terminateOnClose` `boolean` Whether to close the client session when the transport closes.

| JSON representation |
|---|
| ``` { "url": string, "headers": { string: string, ... }, "timeout": string, "sseReadTimeout": string, "terminateOnClose": boolean } ``` |

## GoogleMaps

The GoogleMaps Tool that provides geospatial context for the user's query.
Fields `enableWidget` `boolean` Optional. Whether to return a widget context token in the GroundingMetadata of the response. Developers can use the widget context token to render a Google Maps widget with geospatial context related to the places that the model references in the response.

| JSON representation |
|---|
| ``` { "enableWidget": boolean } ``` |

## ToolChoiceType

The type of tool choice.

| Enums ||
|---|---|
| `TOOL_CHOICE_TYPE_UNSPECIFIED` | Default value. This value is unused. |
| `AUTO` | Auto tool choice. |
| `ANY` | Any tool choice. |
| `NONE` | No tool choice. |
| `VALIDATED` | Validated tool choice. |

## Value

- [JSON representation](https://ai.google.dev/api/generate-content#SCHEMA_REPRESENTATION)
- [ListValue](https://ai.google.dev/api/generate-content#ListValue)
  - [JSON representation](https://ai.google.dev/api/generate-content#ListValue.SCHEMA_REPRESENTATION)

`Value` represents a dynamically typed value which can be either null, a number, a string, a boolean, a recursive struct value, or a list of values. A producer of value is expected to set one of these variants. Absence of any variant indicates an error.
Fields `kind` `Union type` The kind of value. `kind` can be only one of the following: `nullValue` `null` Represents a null value.
`numberValue` `number` Represents a double value.
`stringValue` `string` Represents a string value.
`boolValue` `boolean` Represents a boolean value.
`structValue` ``object (`https://ai.google.dev/api/generate-content#v1beta.Struct`)`` Represents a structured value.
`listValue` ``object (`https://ai.google.dev/api/generate-content#ListValue`)`` Represents a repeated `Value`.
`contentValue` ``object (`https://ai.google.dev/api/generate-content#v1beta.Content`)`` Represents rich content (text, image, etc.).

| JSON representation |
|---|
| ``` { // kind "nullValue": null, "numberValue": number, "stringValue": string, "boolValue": boolean, "structValue": { object (`https://ai.google.dev/api/generate-content#v1beta.Struct`) }, "listValue": { object (`https://ai.google.dev/api/generate-content#ListValue`) }, "contentValue": { object (`https://ai.google.dev/api/generate-content#v1beta.Content`) } // Union type } ``` |

## ListValue

`ListValue` is a wrapper around a repeated field of values.
Fields `values[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.Value`)`` Repeated field of dynamically typed values.

| JSON representation |
|---|
| ``` { "values": [ { object (`https://ai.google.dev/api/generate-content#v1beta.Value`) } ] } ``` |

## VisualizationMode

Enum for visualization mode. Eventually we will support an interactive mode where the user can choose whether to include HTML visualizations in the response.

| Enums ||
|---|---|
| `UNSPECIFIED` | The default visualization mode. Will default to AUTO. |
| `OFF` | Do not include visualizations. |
| `AUTO` | Automatically include visualizations. |

## REST Resource: auth_tokens

- [Resource: AuthToken](https://ai.google.dev/api/generate-content#AuthToken)
  - [JSON representation](https://ai.google.dev/api/generate-content#AuthToken.SCHEMA_REPRESENTATION)
- [BidiGenerateContentSetup](https://ai.google.dev/api/generate-content#BidiGenerateContentSetup)
  - [JSON representation](https://ai.google.dev/api/generate-content#BidiGenerateContentSetup.SCHEMA_REPRESENTATION)
- [GenerationConfig](https://ai.google.dev/api/generate-content#GenerationConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#GenerationConfig.SCHEMA_REPRESENTATION)
- [Modality](https://ai.google.dev/api/generate-content#Modality)
- [SpeechConfig](https://ai.google.dev/api/generate-content#SpeechConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#SpeechConfig.SCHEMA_REPRESENTATION)
- [VoiceConfig](https://ai.google.dev/api/generate-content#VoiceConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#VoiceConfig.SCHEMA_REPRESENTATION)
- [PrebuiltVoiceConfig](https://ai.google.dev/api/generate-content#PrebuiltVoiceConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#PrebuiltVoiceConfig.SCHEMA_REPRESENTATION)
- [MultiSpeakerVoiceConfig](https://ai.google.dev/api/generate-content#MultiSpeakerVoiceConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#MultiSpeakerVoiceConfig.SCHEMA_REPRESENTATION)
- [SpeakerVoiceConfig](https://ai.google.dev/api/generate-content#SpeakerVoiceConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#SpeakerVoiceConfig.SCHEMA_REPRESENTATION)
- [ThinkingConfig](https://ai.google.dev/api/generate-content#ThinkingConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#ThinkingConfig.SCHEMA_REPRESENTATION)
- [ThinkingLevel](https://ai.google.dev/api/generate-content#ThinkingLevel)
- [ImageConfig](https://ai.google.dev/api/generate-content#ImageConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#ImageConfig.SCHEMA_REPRESENTATION)
- [MediaResolution](https://ai.google.dev/api/generate-content#MediaResolution)
- [ResponseFormatConfig](https://ai.google.dev/api/generate-content#ResponseFormatConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#ResponseFormatConfig.SCHEMA_REPRESENTATION)
- [TextResponseFormat](https://ai.google.dev/api/generate-content#TextResponseFormat)
  - [JSON representation](https://ai.google.dev/api/generate-content#TextResponseFormat.SCHEMA_REPRESENTATION)
- [MimeType](https://ai.google.dev/api/generate-content#MimeType)
- [AudioResponseFormat](https://ai.google.dev/api/generate-content#AudioResponseFormat)
  - [JSON representation](https://ai.google.dev/api/generate-content#AudioResponseFormat.SCHEMA_REPRESENTATION)
- [MimeType](https://ai.google.dev/api/generate-content#MimeType_1)
- [Delivery](https://ai.google.dev/api/generate-content#Delivery)
- [ImageResponseFormat](https://ai.google.dev/api/generate-content#ImageResponseFormat)
  - [JSON representation](https://ai.google.dev/api/generate-content#ImageResponseFormat.SCHEMA_REPRESENTATION)
- [MimeType](https://ai.google.dev/api/generate-content#MimeType_2)
- [Delivery](https://ai.google.dev/api/generate-content#Delivery_1)
- [AspectRatio](https://ai.google.dev/api/generate-content#AspectRatio)
- [ImageSize](https://ai.google.dev/api/generate-content#ImageSize)
- [TranslationConfig](https://ai.google.dev/api/generate-content#TranslationConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#TranslationConfig.SCHEMA_REPRESENTATION)
- [RealtimeInputConfig](https://ai.google.dev/api/generate-content#RealtimeInputConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#RealtimeInputConfig.SCHEMA_REPRESENTATION)
- [AutomaticActivityDetection](https://ai.google.dev/api/generate-content#AutomaticActivityDetection)
  - [JSON representation](https://ai.google.dev/api/generate-content#AutomaticActivityDetection.SCHEMA_REPRESENTATION)
- [StartSensitivity](https://ai.google.dev/api/generate-content#StartSensitivity)
- [EndSensitivity](https://ai.google.dev/api/generate-content#EndSensitivity)
- [ActivityHandling](https://ai.google.dev/api/generate-content#ActivityHandling)
- [TurnCoverage](https://ai.google.dev/api/generate-content#TurnCoverage)
- [SessionResumptionConfig](https://ai.google.dev/api/generate-content#SessionResumptionConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#SessionResumptionConfig.SCHEMA_REPRESENTATION)
- [ContextWindowCompressionConfig](https://ai.google.dev/api/generate-content#ContextWindowCompressionConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#ContextWindowCompressionConfig.SCHEMA_REPRESENTATION)
- [SlidingWindow](https://ai.google.dev/api/generate-content#SlidingWindow)
  - [JSON representation](https://ai.google.dev/api/generate-content#SlidingWindow.SCHEMA_REPRESENTATION)
- [AudioTranscriptionConfig](https://ai.google.dev/api/generate-content#AudioTranscriptionConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#AudioTranscriptionConfig.SCHEMA_REPRESENTATION)
- [LanguageAuto](https://ai.google.dev/api/generate-content#LanguageAuto)
- [LanguageHints](https://ai.google.dev/api/generate-content#LanguageHints)
  - [JSON representation](https://ai.google.dev/api/generate-content#LanguageHints.SCHEMA_REPRESENTATION)
- [HistoryConfig](https://ai.google.dev/api/generate-content#HistoryConfig)
  - [JSON representation](https://ai.google.dev/api/generate-content#HistoryConfig.SCHEMA_REPRESENTATION)
- [Methods](https://ai.google.dev/api/generate-content#METHODS_SUMMARY)

## Resource: AuthToken

A request to create an ephemeral authentication token.
Fields `name` `string` Output only. Identifier. The token itself.
`expireTime` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#timestamp` format)`` Optional. Input only. Immutable. An optional time after which, when using the resulting token, messages in BidiGenerateContent sessions will be rejected. (Gemini may preemptively close the session after this time.)

If not set then this defaults to 30 minutes in the future. If set, this value must be less than 20 hours in the future.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: `"2014-10-02T15:01:23Z"`, `"2014-10-02T15:01:23.045123456Z"` or `"2014-10-02T15:01:23+05:30"`.
`newSessionExpireTime` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#timestamp` format)`` Optional. Input only. Immutable. The time after which new Live API sessions using the token resulting from this request will be rejected.

If not set this defaults to 60 seconds in the future. If set, this value must be less than 20 hours in the future.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: `"2014-10-02T15:01:23Z"`, `"2014-10-02T15:01:23.045123456Z"` or `"2014-10-02T15:01:23+05:30"`.
`fieldMask` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#field-mask` format)`` Optional. Input only. Immutable. If fieldMask is empty, and `bidiGenerateContentSetup` is not present, then the effective `BidiGenerateContentSetup` message is taken from the Live API connection.

If fieldMask is empty, and `bidiGenerateContentSetup` *is* present, then the effective `BidiGenerateContentSetup` message is taken entirely from `bidiGenerateContentSetup` in this request. The setup message from the Live API connection is ignored.

If fieldMask is not empty, then the corresponding fields from `bidiGenerateContentSetup` will overwrite the fields from the setup message in the Live API connection.

This is a comma-separated list of fully qualified names of fields. Example: `"user.displayName,photo"`.
`config` `Union type` The method-specific configuration for the resulting token. `config` can be only one of the following: `bidiGenerateContentSetup` ``object (`https://ai.google.dev/api/generate-content#BidiGenerateContentSetup`)`` Optional. Input only. Immutable. Configuration specific to `BidiGenerateContent`.
`uses` `integer` Optional. Input only. Immutable. The number of times the token can be used. If this value is zero then no limit is applied. Resuming a Live API session does not count as a use. If unspecified, the default is 1.

| JSON representation |
|---|
| ``` { "name": string, "expireTime": string, "newSessionExpireTime": string, "fieldMask": string, // config "bidiGenerateContentSetup": { object (`https://ai.google.dev/api/generate-content#BidiGenerateContentSetup`) } // Union type "uses": integer } ``` |

## BidiGenerateContentSetup

Message to be sent in the first (and only in the first) `BidiGenerateContentClientMessage`. Contains configuration that will apply for the duration of the streaming RPC.

Clients should wait for a `BidiGenerateContentSetupComplete` message before sending any additional messages.
Fields `model` `string` Required. The model's resource name. This serves as an ID for the Model to use.

Format: `models/{model}`
`generationConfig` ``object (`https://ai.google.dev/api/generate-content#GenerationConfig`)`` Optional. Generation config.

The following fields are not supported:

- `responseLogprobs`
- `responseMimeType`
- `logprobs`
- `responseSchema`
- `responseJsonSchema`
- `stop_sequence`
- `skipResponseCache`
- `routing_config`
- `audio_timestamp`
`systemInstruction` ``object (`Content`)`` Optional. The user provided system instructions for the model.

Note: Only text should be used in parts and content in each part will be in a separate paragraph.
`tools[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.Tool`)`` Optional. A list of `Tools` the model may use to generate the next response.

A `Tool` is a piece of code that enables the system to interact with external systems to perform an action, or set of actions, outside of knowledge and scope of the model.
`realtimeInputConfig` ``object (`https://ai.google.dev/api/generate-content#RealtimeInputConfig`)`` Optional. Configures the handling of realtime input.
`sessionResumption` ``object (`https://ai.google.dev/api/generate-content#SessionResumptionConfig`)`` Optional. Configures session resumption mechanism.

If included, the server will send `SessionResumptionUpdate` messages.
`contextWindowCompression` ``object (`https://ai.google.dev/api/generate-content#ContextWindowCompressionConfig`)`` Optional. Configures a context window compression mechanism.

If included, the server will automatically reduce the size of the context when it exceeds the configured length.
`inputAudioTranscription` ``object (`https://ai.google.dev/api/generate-content#AudioTranscriptionConfig`)`` Optional. If set, enables transcription of voice input. The transcription aligns with the input audio language, if configured.
`outputAudioTranscription` ``object (`https://ai.google.dev/api/generate-content#AudioTranscriptionConfig`)`` Optional. If set, enables transcription of the model's audio output. The transcription aligns with the language code specified for the output audio, if configured.
`historyConfig` ``object (`https://ai.google.dev/api/generate-content#HistoryConfig`)`` Optional. Configures the exchange of history between the client and the server.

| JSON representation |
|---|
| ``` { "model": string, "generationConfig": { object (`https://ai.google.dev/api/generate-content#GenerationConfig`) }, "systemInstruction": { object (`Content`) }, "tools": [ { object (`https://ai.google.dev/api/generate-content#v1beta.Tool`) } ], "realtimeInputConfig": { object (`https://ai.google.dev/api/generate-content#RealtimeInputConfig`) }, "sessionResumption": { object (`https://ai.google.dev/api/generate-content#SessionResumptionConfig`) }, "contextWindowCompression": { object (`https://ai.google.dev/api/generate-content#ContextWindowCompressionConfig`) }, "inputAudioTranscription": { object (`https://ai.google.dev/api/generate-content#AudioTranscriptionConfig`) }, "outputAudioTranscription": { object (`https://ai.google.dev/api/generate-content#AudioTranscriptionConfig`) }, "historyConfig": { object (`https://ai.google.dev/api/generate-content#HistoryConfig`) } } ``` |

## GenerationConfig

Configuration options for model generation and outputs. Not all parameters are configurable for every model.
Fields `stopSequences[]` `string` Optional. The set of character sequences (up to 5) that will stop output generation. If specified, the API will stop at the first appearance of a `stop_sequence`. The stop sequence will not be included as part of the response.
`responseMimeType` `string` Optional. MIME type of the generated candidate text. Supported MIME types are: `text/plain`: (default) Text output. `application/json`: JSON response in the response candidates. `text/x.enum`: ENUM as a string response in the response candidates. Refer to the [docs](https://ai.google.dev/gemini-api/docs/prompting_with_media#plain_text_formats) for a list of all supported text MIME types.
`responseSchema
(deprecated)` ``object (`https://ai.google.dev/api/generate-content#v1beta.Schema`)``

> [!WARNING]
> This item is deprecated!

Optional. Output schema of the generated candidate text. Schemas must be a subset of the [OpenAPI schema](https://spec.openapis.org/oas/v3.0.3#schema) and can be objects, primitives or arrays.

If set, a compatible `responseMimeType` must also be set. Compatible MIME types: `application/json`: Schema for JSON response. Refer to the [JSON text generation guide](https://ai.google.dev/gemini-api/docs/json-mode) for more details.
`_responseJsonSchema
(deprecated)` ``value (`https://protobuf.dev/reference/protobuf/google.protobuf#value` format)``

> [!WARNING]
> This item is deprecated!

Optional. Output schema of the generated response. This is an alternative to `responseSchema` that accepts [JSON Schema](https://json-schema.org/).

If set, `responseSchema` must be omitted, but `responseMimeType` is required.

While the full JSON Schema may be sent, not all features are supported. Specifically, only the following properties are supported:

- `$id`
- `$defs`
- `$ref`
- `$anchor`
- `type`
- `format`
- `title`
- `description`
- `enum` (for strings and numbers)
- `items`
- `prefixItems`
- `minItems`
- `maxItems`
- `minimum`
- `maximum`
- `anyOf`
- `oneOf` (interpreted the same as `anyOf`)
- `properties`
- `additionalProperties`
- `required`

The non-standard `propertyOrdering` property may also be set.

Cyclic references are unrolled to a limited degree and, as such, may only be used within non-required properties. (Nullable properties are not sufficient.) If `$ref` is set on a sub-schema, no other properties, except for than those starting as a `$`, may be set.
`responseJsonSchema` ``value (`https://protobuf.dev/reference/protobuf/google.protobuf#value` format)`` Optional. An internal detail. Use `responseJsonSchema` rather than this field.
`responseModalities[]` ``enum (`https://ai.google.dev/api/generate-content#Modality`)`` Optional. The requested modalities of the response. Represents the set of modalities that the model can return, and should be expected in the response. This is an exact match to the modalities of the response.

A model may have multiple combinations of supported modalities. If the requested modalities do not match any of the supported combinations, an error will be returned.

An empty list is equivalent to requesting only text.
`candidateCount` `integer` Optional. Number of generated responses to return. If unset, this will default to 1. Please note that this doesn't work for previous generation models (Gemini 1.0 family)
`maxOutputTokens` `integer` Optional. The maximum number of tokens to include in a response candidate.

Note: The default value varies by model, see the `Model.output_token_limit` attribute of the `Model` returned from the `getModel` function.
`temperature` `number` Optional. Controls the randomness of the output.

Note: The default value varies by model, see the `Model.temperature` attribute of the `Model` returned from the `getModel` function.

Values can range from \[0.0, 2.0\].
`topP` `number` Optional. The maximum cumulative probability of tokens to consider when sampling.

The model uses combined Top-k and Top-p (nucleus) sampling.

Tokens are sorted based on their assigned probabilities so that only the most likely tokens are considered. Top-k sampling directly limits the maximum number of tokens to consider, while Nucleus sampling limits the number of tokens based on the cumulative probability.

Note: The default value varies by `Model` and is specified by the`Model.top_p` attribute returned from the `getModel` function. An empty `topK` attribute indicates that the model doesn't apply top-k sampling and doesn't allow setting `topK` on requests.
`topK` `integer` Optional. The maximum number of tokens to consider when sampling.

Gemini models use Top-p (nucleus) sampling or a combination of Top-k and nucleus sampling. Top-k sampling considers the set of `topK` most probable tokens. Models running with nucleus sampling don't allow topK setting.

Note: The default value varies by `Model` and is specified by the`Model.top_p` attribute returned from the `getModel` function. An empty `topK` attribute indicates that the model doesn't apply top-k sampling and doesn't allow setting `topK` on requests.
`seed` `integer` Optional. Seed used in decoding. If not set, the request uses a randomly generated seed.
`presencePenalty` `number` Optional. Presence penalty applied to the next token's logprobs if the token has already been seen in the response.

This penalty is binary on/off and not dependant on the number of times the token is used (after the first). Use `https://ai.google.dev/api/generate-content#GenerationConfig.FIELDS.frequency_penalty` for a penalty that increases with each use.

A positive penalty will discourage the use of tokens that have already been used in the response, increasing the vocabulary.

A negative penalty will encourage the use of tokens that have already been used in the response, decreasing the vocabulary.
`frequencyPenalty` `number` Optional. Frequency penalty applied to the next token's logprobs, multiplied by the number of times each token has been seen in the respponse so far.

A positive penalty will discourage the use of tokens that have already been used, proportional to the number of times the token has been used: The more a token is used, the more difficult it is for the model to use that token again increasing the vocabulary of responses.

Caution: A *negative* penalty will encourage the model to reuse tokens proportional to the number of times the token has been used. Small negative values will reduce the vocabulary of a response. Larger negative values will cause the model to start repeating a common token until it hits the `https://ai.google.dev/api/generate-content#GenerationConfig.FIELDS.max_output_tokens` limit.
`responseLogprobs` `boolean` Optional. If true, export the logprobs results in response.
`logprobs` `integer` Optional. Only valid if `https://ai.google.dev/api/generate-content#GenerationConfig.FIELDS.response_logprobs`. This sets the number of top logprobs, including the chosen candidate, to return at each decoding step in the `https://ai.google.dev/api/generate-content#FIELDS.logprobs_result`. The number must be in the range of \[0, 20\].
`enableEnhancedCivicAnswers` `boolean` Optional. Enables enhanced civic answers. It may not be available for all models.
`speechConfig` ``object (`https://ai.google.dev/api/generate-content#SpeechConfig`)`` Optional. The speech generation config.
`thinkingConfig` ``object (`https://ai.google.dev/api/generate-content#ThinkingConfig`)`` Optional. Config for thinking features. An error will be returned if this field is set for models that don't support thinking.
`imageConfig` ``object (`https://ai.google.dev/api/generate-content#ImageConfig`)`` Optional. Config for image generation. An error will be returned if this field is set for models that don't support these config options.
`mediaResolution` ``enum (`https://ai.google.dev/api/generate-content#MediaResolution`)`` Optional. If specified, the media resolution specified will be used.
`enableAffectiveDialog` `boolean` Optional. If enabled, the model will detect emotions and adapt its responses accordingly.
`responseFormat` ``object (`https://ai.google.dev/api/generate-content#ResponseFormatConfig`)`` Optional. Configuration for the response output format. Allows specifying output configuration per modality (text, audio, image) in a flat structure.
`translationConfig` ``object (`https://ai.google.dev/api/generate-content#TranslationConfig`)`` Optional. Config for translation.

| JSON representation |
|---|
| ``` { "stopSequences": [ string ], "responseMimeType": string, "responseSchema": { object (`https://ai.google.dev/api/generate-content#v1beta.Schema`) }, "_responseJsonSchema": value, "responseJsonSchema": value, "responseModalities": [ enum (`https://ai.google.dev/api/generate-content#Modality`) ], "candidateCount": integer, "maxOutputTokens": integer, "temperature": number, "topP": number, "topK": integer, "seed": integer, "presencePenalty": number, "frequencyPenalty": number, "responseLogprobs": boolean, "logprobs": integer, "enableEnhancedCivicAnswers": boolean, "speechConfig": { object (`https://ai.google.dev/api/generate-content#SpeechConfig`) }, "thinkingConfig": { object (`https://ai.google.dev/api/generate-content#ThinkingConfig`) }, "imageConfig": { object (`https://ai.google.dev/api/generate-content#ImageConfig`) }, "mediaResolution": enum (`https://ai.google.dev/api/generate-content#MediaResolution`), "enableAffectiveDialog": boolean, "responseFormat": { object (`https://ai.google.dev/api/generate-content#ResponseFormatConfig`) }, "translationConfig": { object (`https://ai.google.dev/api/generate-content#TranslationConfig`) } } ``` |

## Modality

Supported modalities of the response.

| Enums ||
|---|---|
| `MODALITY_UNSPECIFIED` | Default value. |
| `TEXT` | Indicates the model should return text. |
| `IMAGE` | Indicates the model should return images. |
| `AUDIO` | Indicates the model should return audio. |

## SpeechConfig

Config for speech generation and transcription.
Fields `voiceConfig` ``object (`https://ai.google.dev/api/generate-content#VoiceConfig`)`` The configuration in case of single-voice output.
`multiSpeakerVoiceConfig` ``object (`https://ai.google.dev/api/generate-content#MultiSpeakerVoiceConfig`)`` Optional. The configuration for the multi-speaker setup. It is mutually exclusive with the voiceConfig field.
`languageCode` `string` Optional. The IETF [BCP-47](https://www.rfc-editor.org/rfc/bcp/bcp47.txt) language code that the user configured the app to use. Used for speech recognition and synthesis.

Valid values are: `de-DE`, `en-AU`, `en-GB`, `en-IN`, `en-US`, `es-US`, `fr-FR`, `hi-IN`, `pt-BR`, `ar-XA`, `es-ES`, `fr-CA`, `id-ID`, `it-IT`, `ja-JP`, `tr-TR`, `vi-VN`, `bn-IN`, `gu-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `ta-IN`, `te-IN`, `nl-NL`, `ko-KR`, `cmn-CN`, `pl-PL`, `ru-RU`, and `th-TH`.

| JSON representation |
|---|
| ``` { "voiceConfig": { object (`https://ai.google.dev/api/generate-content#VoiceConfig`) }, "multiSpeakerVoiceConfig": { object (`https://ai.google.dev/api/generate-content#MultiSpeakerVoiceConfig`) }, "languageCode": string } ``` |

## VoiceConfig

The configuration for the voice to use.
Fields `voice_config` `Union type` The configuration for the speaker to use. `voice_config` can be only one of the following: `prebuiltVoiceConfig` ``object (`https://ai.google.dev/api/generate-content#PrebuiltVoiceConfig`)`` The configuration for the prebuilt voice to use.

| JSON representation |
|---|
| ``` { // voice_config "prebuiltVoiceConfig": { object (`https://ai.google.dev/api/generate-content#PrebuiltVoiceConfig`) } // Union type } ``` |

## PrebuiltVoiceConfig

The configuration for the prebuilt speaker to use.
Fields `voiceName` `string` The name of the preset voice to use.

| JSON representation |
|---|
| ``` { "voiceName": string } ``` |

## MultiSpeakerVoiceConfig

The configuration for the multi-speaker setup.
Fields `speakerVoiceConfigs[]` ``object (`https://ai.google.dev/api/generate-content#SpeakerVoiceConfig`)`` Required. All the enabled speaker voices.

| JSON representation |
|---|
| ``` { "speakerVoiceConfigs": [ { object (`https://ai.google.dev/api/generate-content#SpeakerVoiceConfig`) } ] } ``` |

## SpeakerVoiceConfig

The configuration for a single speaker in a multi speaker setup.
Fields `speaker` `string` Required. The name of the speaker to use. Should be the same as in the prompt.
`voiceConfig` ``object (`https://ai.google.dev/api/generate-content#VoiceConfig`)`` Required. The configuration for the voice to use.

| JSON representation |
|---|
| ``` { "speaker": string, "voiceConfig": { object (`https://ai.google.dev/api/generate-content#VoiceConfig`) } } ``` |

## ThinkingConfig

Config for thinking features.
Fields `includeThoughts` `boolean` Indicates whether to include thoughts in the response. If true, thoughts are returned only when available.
`thinkingBudget` `integer` The number of thoughts tokens that the model should generate.
`thinkingLevel` ``enum (`https://ai.google.dev/api/generate-content#ThinkingLevel`)`` Optional. Controls the maximum depth of the model's internal reasoning process before it produces a response. The default value is model-dependent. Refer to the [Thinking levels guide](https://ai.google.dev/gemini-api/docs/thinking#thinking-levels) for more details. Recommended for Gemini 3 or later models. Use with earlier models results in an error.

| JSON representation |
|---|
| ``` { "includeThoughts": boolean, "thinkingBudget": integer, "thinkingLevel": enum (`https://ai.google.dev/api/generate-content#ThinkingLevel`) } ``` |

## ThinkingLevel

Allow user to specify how much to think using enum instead of integer budget.

| Enums ||
|---|---|
| `THINKING_LEVEL_UNSPECIFIED` | Default value. |
| `MINIMAL` | Little to no thinking. |
| `LOW` | Low thinking level. |
| `MEDIUM` | Medium thinking level. |
| `HIGH` | High thinking level. |

## ImageConfig

Config for image generation features.
Fields `aspectRatio` `string` Optional. The aspect ratio of the image to generate. Supported aspect ratios: `1:1`, `1:4`, `4:1`, `1:8`, `8:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, or `21:9`.

If not specified, the model will choose a default aspect ratio based on any reference images provided.
`imageSize` `string` Optional. Specifies the size of generated images. Supported values are `512`, `1K`, `2K`, `4K`. If not specified, the model will use default value `1K`.

| JSON representation |
|---|
| ``` { "aspectRatio": string, "imageSize": string } ``` |

## MediaResolution

Media resolution for the input media.

| Enums ||
|---|---|
| `MEDIA_RESOLUTION_UNSPECIFIED` | Media resolution has not been set. |
| `MEDIA_RESOLUTION_LOW` | Media resolution set to low (64 tokens). |
| `MEDIA_RESOLUTION_MEDIUM` | Media resolution set to medium (256 tokens). |
| `MEDIA_RESOLUTION_HIGH` | Media resolution set to high (zoomed reframing with 256 tokens). |

## ResponseFormatConfig

Configuration for the response output format. This is a flat object where each optional sub-field configures a specific output modality.
Fields `text` ``object (`https://ai.google.dev/api/generate-content#TextResponseFormat`)`` Optional. Text output format configuration.
`audio` ``object (`https://ai.google.dev/api/generate-content#AudioResponseFormat`)`` Optional. Audio output format configuration.
`image` ``object (`https://ai.google.dev/api/generate-content#ImageResponseFormat`)`` Optional. Image output format configuration.

| JSON representation |
|---|
| ``` { "text": { object (`https://ai.google.dev/api/generate-content#TextResponseFormat`) }, "audio": { object (`https://ai.google.dev/api/generate-content#AudioResponseFormat`) }, "image": { object (`https://ai.google.dev/api/generate-content#ImageResponseFormat`) } } ``` |

## TextResponseFormat

Configuration for text output format.
Fields `mimeType` ``enum (`https://ai.google.dev/api/generate-content#MimeType`)`` Optional. The MIME type of the text output.
`schema` ``value (`https://protobuf.dev/reference/protobuf/google.protobuf#value` format)`` Optional. The JSON schema that the output should conform to. Only applicable when mimeType is APPLICATION_JSON.

| JSON representation |
|---|
| ``` { "mimeType": enum (`https://ai.google.dev/api/generate-content#MimeType`), "schema": value } ``` |

## MimeType

Supported MIME types for text output.

| Enums ||
|---|---|
| `MIME_TYPE_UNSPECIFIED` | Default value. This value is unused. |
| `APPLICATION_JSON` | JSON output format. |
| `TEXT_PLAIN` | Plain text output format. |

## AudioResponseFormat

Configuration for audio output format.
Fields `mimeType` ``enum (`https://ai.google.dev/api/generate-content#MimeType_1`)`` Optional. The MIME type of the audio output.
`delivery` ``enum (`https://ai.google.dev/api/generate-content#Delivery`)`` Optional. The delivery mode for the audio output.
`sampleRate` `integer` Optional. Sample rate in Hz.
`bitRate` `integer` Optional. Bit rate in bits per second (bps). Only applicable for compressed formats (MP3, Opus).

| JSON representation |
|---|
| ``` { "mimeType": enum (`https://ai.google.dev/api/generate-content#MimeType_1`), "delivery": enum (`https://ai.google.dev/api/generate-content#Delivery`), "sampleRate": integer, "bitRate": integer } ``` |

## MimeType

Supported MIME types for audio output.

| Enums ||
|---|---|
| `MIME_TYPE_UNSPECIFIED` | Default value. This value is unused. |
| `AUDIO_MP3` | MP3 audio format. |
| `AUDIO_OGG_OPUS` | OGG Opus audio format. |
| `AUDIO_L16` | Raw PCM (L16) audio format. |
| `AUDIO_WAV` | WAV audio format. |
| `AUDIO_ALAW` | A-law audio format. |
| `AUDIO_MULAW` | Mu-law audio format. |

## Delivery

Delivery mode for audio output.

| Enums ||
|---|---|
| `DELIVERY_UNSPECIFIED` | Default value. This value is unused. |
| `INLINE` | Audio data is returned inline in the response. |
| `URI` | Audio data is returned as a URI. |

## ImageResponseFormat

Configuration for image output format.
Fields `mimeType` ``enum (`https://ai.google.dev/api/generate-content#MimeType_2`)`` Optional. The MIME type of the image output.
`delivery` ``enum (`https://ai.google.dev/api/generate-content#Delivery_1`)`` Optional. The delivery mode for the image output.
`aspectRatio` ``enum (`https://ai.google.dev/api/generate-content#AspectRatio`)`` Optional. The aspect ratio for the image output.
`imageSize` ``enum (`https://ai.google.dev/api/generate-content#ImageSize`)`` Optional. The size of the image output.

| JSON representation |
|---|
| ``` { "mimeType": enum (`https://ai.google.dev/api/generate-content#MimeType_2`), "delivery": enum (`https://ai.google.dev/api/generate-content#Delivery_1`), "aspectRatio": enum (`https://ai.google.dev/api/generate-content#AspectRatio`), "imageSize": enum (`https://ai.google.dev/api/generate-content#ImageSize`) } ``` |

## MimeType

Supported MIME types for image output.

| Enums ||
|---|---|
| `MIME_TYPE_UNSPECIFIED` | Default value. This value is unused. |
| `IMAGE_JPEG` | JPEG image format. |

## Delivery

Delivery mode for image output.

| Enums ||
|---|---|
| `DELIVERY_UNSPECIFIED` | Default value. This value is unused. |
| `INLINE` | Image data is returned inline in the response. |
| `URI` | Image data is returned as a URI. |

## AspectRatio

Supported aspect ratios for image output.

| Enums ||
|---|---|
| `ASPECT_RATIO_UNSPECIFIED` | Default value. This value is unused. |
| `ASPECT_RATIO_ONE_BY_ONE` | 1:1 aspect ratio. |
| `ASPECT_RATIO_TWO_BY_THREE` | 2:3 aspect ratio. |
| `ASPECT_RATIO_THREE_BY_TWO` | 3:2 aspect ratio. |
| `ASPECT_RATIO_THREE_BY_FOUR` | 3:4 aspect ratio. |
| `ASPECT_RATIO_FOUR_BY_THREE` | 4:3 aspect ratio. |
| `ASPECT_RATIO_FOUR_BY_FIVE` | 4:5 aspect ratio. |
| `ASPECT_RATIO_FIVE_BY_FOUR` | 5:4 aspect ratio. |
| `ASPECT_RATIO_NINE_BY_SIXTEEN` | 9:16 aspect ratio. |
| `ASPECT_RATIO_SIXTEEN_BY_NINE` | 16:9 aspect ratio. |
| `ASPECT_RATIO_TWENTY_ONE_BY_NINE` | 21:9 aspect ratio. |
| `ASPECT_RATIO_ONE_BY_EIGHT` | 1:8 aspect ratio. |
| `ASPECT_RATIO_EIGHT_BY_ONE` | 8:1 aspect ratio. |
| `ASPECT_RATIO_ONE_BY_FOUR` | 1:4 aspect ratio. |
| `ASPECT_RATIO_FOUR_BY_ONE` | 4:1 aspect ratio. |

## ImageSize

Supported image sizes for image output.

| Enums ||
|---|---|
| `IMAGE_SIZE_UNSPECIFIED` | Default value. This value is unused. |
| `IMAGE_SIZE_FIVE_TWELVE` | 512px image size. |
| `IMAGE_SIZE_ONE_K` | 1K image size. |
| `IMAGE_SIZE_TWO_K` | 2K image size. |
| `IMAGE_SIZE_FOUR_K` | 4K image size. |

## TranslationConfig

Config for translation features.
Fields `targetLanguageCode` `string` Required. The target language for translation. Supported values are BCP-47 language codes (e.g. "en", "es", "fr").
`echoTargetLanguage` `boolean` Optional. If true, the model will generate audio when the target language is spoken, essentially it will parrot the input. If false, we will not produce audio for the target language.

| JSON representation |
|---|
| ``` { "targetLanguageCode": string, "echoTargetLanguage": boolean } ``` |

## RealtimeInputConfig

Configures the realtime input behavior in `BidiGenerateContent`.
Fields `automaticActivityDetection` ``object (`https://ai.google.dev/api/generate-content#AutomaticActivityDetection`)`` Optional. If not set, automatic activity detection is enabled by default. If automatic voice detection is disabled, the client must send activity signals.
`activityHandling` ``enum (`https://ai.google.dev/api/generate-content#ActivityHandling`)`` Optional. Defines what effect activity has.
`turnCoverage` ``enum (`https://ai.google.dev/api/generate-content#TurnCoverage`)`` Optional. Defines which input is included in the user's turn.

| JSON representation |
|---|
| ``` { "automaticActivityDetection": { object (`https://ai.google.dev/api/generate-content#AutomaticActivityDetection`) }, "activityHandling": enum (`https://ai.google.dev/api/generate-content#ActivityHandling`), "turnCoverage": enum (`https://ai.google.dev/api/generate-content#TurnCoverage`) } ``` |

## AutomaticActivityDetection

Configures automatic detection of activity.
Fields `disabled` `boolean` Optional. If enabled (the default), detected voice and text input count as activity. If disabled, the client must send activity signals.
`startOfSpeechSensitivity` ``enum (`https://ai.google.dev/api/generate-content#StartSensitivity`)`` Optional. Determines how likely speech is to be detected.
`prefixPaddingMs` `integer` Optional. The required duration of detected speech before start-of-speech is committed. The lower this value, the more sensitive the start-of-speech detection is and shorter speech can be recognized. However, this also increases the probability of false positives.
`endOfSpeechSensitivity` ``enum (`https://ai.google.dev/api/generate-content#EndSensitivity`)`` Optional. Determines how likely detected speech is ended.
`silenceDurationMs` `integer` Optional. The required duration of detected non-speech (e.g. silence) before end-of-speech is committed. The larger this value, the longer speech gaps can be without interrupting the user's activity but this will increase the model's latency.

| JSON representation |
|---|
| ``` { "disabled": boolean, "startOfSpeechSensitivity": enum (`https://ai.google.dev/api/generate-content#StartSensitivity`), "prefixPaddingMs": integer, "endOfSpeechSensitivity": enum (`https://ai.google.dev/api/generate-content#EndSensitivity`), "silenceDurationMs": integer } ``` |

## StartSensitivity

Determines how start of speech is detected.

| Enums ||
|---|---|
| `START_SENSITIVITY_UNSPECIFIED` | The default is START_SENSITIVITY_HIGH. |
| `START_SENSITIVITY_HIGH` | Automatic detection will detect the start of speech more often. |
| `START_SENSITIVITY_LOW` | Automatic detection will detect the start of speech less often. |

## EndSensitivity

Determines how end of speech is detected.

| Enums ||
|---|---|
| `END_SENSITIVITY_UNSPECIFIED` | The default is END_SENSITIVITY_HIGH. |
| `END_SENSITIVITY_HIGH` | Automatic detection ends speech more often. |
| `END_SENSITIVITY_LOW` | Automatic detection ends speech less often. |

## ActivityHandling

The different ways of handling user activity.

| Enums ||
|---|---|
| `ACTIVITY_HANDLING_UNSPECIFIED` | If unspecified, the default behavior is `START_OF_ACTIVITY_INTERRUPTS`. |
| `START_OF_ACTIVITY_INTERRUPTS` | If true, start of activity will interrupt the model's response (also called "barge in"). The model's current response will be cut-off in the moment of the interruption. This is the default behavior. |
| `NO_INTERRUPTION` | The model's response will not be interrupted. |

## TurnCoverage

Options about which input is included in the user's turn.

| Enums ||
|---|---|
| `TURN_COVERAGE_UNSPECIFIED` | If unspecified, a default behavior is selected based on the model. E.g., for Gemini 2.5, the default is `TURN_INCLUDES_ONLY_ACTIVITY`, while for Gemini 3.1 and onwards, it's `TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO`. |
| `TURN_INCLUDES_ONLY_ACTIVITY` | Includes activity since the last turn, excluding inactivity (e.g. silence on the audio stream). |
| `TURN_INCLUDES_ALL_INPUT` | Includes all realtime input since the last turn, including inactivity (e.g. silence on the audio stream). |
| `TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO` | Includes audio activity and all video since the last turn. With automatic activity detection, audio activity means speech and excludes silence. |

## SessionResumptionConfig

Session resumption configuration.

This message is included in the session configuration as `BidiGenerateContentSetup.session_resumption`. If configured, the server will send `SessionResumptionUpdate` messages.
Fields `handle` `string` The handle of a previous session. If not present then a new session is created.

Session handles come from `SessionResumptionUpdate.token` values in previous connections.

| JSON representation |
|---|
| ``` { "handle": string } ``` |

## ContextWindowCompressionConfig

Enables context window compression --- a mechanism for managing the model's context window so that it does not exceed a given length.
Fields `compression_mechanism` `Union type` The context window compression mechanism used. `compression_mechanism` can be only one of the following: `slidingWindow` ``object (`https://ai.google.dev/api/generate-content#SlidingWindow`)`` A sliding-window mechanism.
`triggerTokens` `string (https://developers.google.com/discovery/v1/type-format format)` The number of tokens (before running a turn) required to trigger a context window compression.

This can be used to balance quality against latency as shorter context windows may result in faster model responses. However, any compression operation will cause a temporary latency increase, so they should not be triggered frequently.

If not set, the default is 80% of the model's context window limit. This leaves 20% for the next user request/model response.

| JSON representation |
|---|
| ``` { // compression_mechanism "slidingWindow": { object (`https://ai.google.dev/api/generate-content#SlidingWindow`) } // Union type "triggerTokens": string } ``` |

## SlidingWindow

The SlidingWindow method operates by discarding content at the beginning of the context window. The resulting context will always begin at the start of a USER role turn. System instructions and any `BidiGenerateContentSetup.prefix_turns` will always remain at the beginning of the result.
Fields `targetTokens` `string (https://developers.google.com/discovery/v1/type-format format)` The target number of tokens to keep. The default value is triggerTokens/2.

Discarding parts of the context window causes a temporary latency increase so this value should be calibrated to avoid frequent compression operations.

| JSON representation |
|---|
| ``` { "targetTokens": string } ``` |

## AudioTranscriptionConfig

The audio transcription configuration.
Fields `adaptationPhrases[]
(deprecated)` `string`

> [!WARNING]
> This item is deprecated!

Optional. A list of phrases used for speech adaptation, which biases the ASR model to improve recognition of these specific terms.
`customVocabulary[]` `string` Optional. A list of custom vocabulary phrases to bias the speech recognition model toward recognizing specific terms (product names, proper nouns, jargon).
`language_config` `Union type` The language config for the audio transcription. For ASR models, it is required, an error will be returned if not set. `language_config` can be only one of the following: `languageAuto` ``object (`https://ai.google.dev/api/generate-content#LanguageAuto`)`` Optional. The model will detect the language automatically.
`languageHints` ``object (`https://ai.google.dev/api/generate-content#LanguageHints`)`` Optional. Specifies one or more languages in the audio.

| JSON representation |
|---|
| ``` { "adaptationPhrases": [ string ], "customVocabulary": [ string ], // language_config "languageAuto": { object (`https://ai.google.dev/api/generate-content#LanguageAuto`) }, "languageHints": { object (`https://ai.google.dev/api/generate-content#LanguageHints`) } // Union type } ``` |

## LanguageAuto

This type has no fields.
Indicates the language of the audio should be automatically detected.

## LanguageHints

Provides hints to the model about possible languages present in the audio.
Fields `languageCodes[]` `string` Required. BCP-47 language codes.

| JSON representation |
|---|
| ``` { "languageCodes": [ string ] } ``` |

## HistoryConfig

History configuration.

This message is included in the session configuration as `BidiGenerateContentSetup.history_config`. Configures the exchange of history messages.
Fields `initialHistoryInClientContent` `boolean` Optional. If true, after sending `setupComplete`, the server will wait and at first process `clientContent` messages until `turnComplete` is `true`. This initial history will not trigger a model call and may end with role `MODEL`. After `turnComplete` is `true`, the client can start the realtime conversation via `realtimeInput`.

| JSON representation |
|---|
| ``` { "initialHistoryInClientContent": boolean } ``` |

## Method: auth_tokens.create

- [Endpoint](https://ai.google.dev/api/generate-content#body.HTTP_TEMPLATE)
- [Request body](https://ai.google.dev/api/generate-content#body.request_body)
- [Response body](https://ai.google.dev/api/generate-content#body.response_body)
- [Authorization scopes](https://ai.google.dev/api/generate-content#body.aspect)

Creates a token that can be used to constrain the behavior of a BidiGenerateContent session.

### Endpoint

post `https://generativelanguage.googleapis.com/v1beta/auth_tokens`   

### Request body

The request body contains an instance of `https://ai.google.dev/api/generate-content#AuthToken`.
Fields `expireTime` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#timestamp` format)`` Optional. Input only. Immutable. An optional time after which, when using the resulting token, messages in BidiGenerateContent sessions will be rejected. (Gemini may preemptively close the session after this time.)

If not set then this defaults to 30 minutes in the future. If set, this value must be less than 20 hours in the future.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: `"2014-10-02T15:01:23Z"`, `"2014-10-02T15:01:23.045123456Z"` or `"2014-10-02T15:01:23+05:30"`.
`newSessionExpireTime` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#timestamp` format)`` Optional. Input only. Immutable. The time after which new Live API sessions using the token resulting from this request will be rejected.

If not set this defaults to 60 seconds in the future. If set, this value must be less than 20 hours in the future.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: `"2014-10-02T15:01:23Z"`, `"2014-10-02T15:01:23.045123456Z"` or `"2014-10-02T15:01:23+05:30"`.
`fieldMask` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#field-mask` format)`` Optional. Input only. Immutable. If fieldMask is empty, and `bidiGenerateContentSetup` is not present, then the effective `BidiGenerateContentSetup` message is taken from the Live API connection.

If fieldMask is empty, and `bidiGenerateContentSetup` *is* present, then the effective `BidiGenerateContentSetup` message is taken entirely from `bidiGenerateContentSetup` in this request. The setup message from the Live API connection is ignored.

If fieldMask is not empty, then the corresponding fields from `bidiGenerateContentSetup` will overwrite the fields from the setup message in the Live API connection.

This is a comma-separated list of fully qualified names of fields. Example: `"user.displayName,photo"`.
`config` `Union type` The method-specific configuration for the resulting token. `config` can be only one of the following: `bidiGenerateContentSetup` ``object (`https://ai.google.dev/api/generate-content#BidiGenerateContentSetup`)`` Optional. Input only. Immutable. Configuration specific to `BidiGenerateContent`.
`uses` `integer` Optional. Input only. Immutable. The number of times the token can be used. If this value is zero then no limit is applied. Resuming a Live API session does not count as a use. If unspecified, the default is 1.

### Response body

If successful, the response body contains a newly created instance of `https://ai.google.dev/api/generate-content#AuthToken`.