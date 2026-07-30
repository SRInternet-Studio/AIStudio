Context caching allows you to save and reuse precomputed input tokens that you wish to use repeatedly, for example when asking different questions about the same media file. This can lead to cost and speed savings, depending on the usage. For a detailed introduction, see the [Context caching](https://ai.google.dev/gemini-api/docs/caching) guide.

## Method: cachedContents.create

- [Endpoint](https://ai.google.dev/api/caching#body.HTTP_TEMPLATE)
- [Request body](https://ai.google.dev/api/caching#body.request_body)
- [Response body](https://ai.google.dev/api/caching#body.response_body)
- [Authorization scopes](https://ai.google.dev/api/caching#body.aspect)
- [Example request](https://ai.google.dev/api/caching#body.codeSnippets)
  - [Basic](https://ai.google.dev/api/caching#body.codeSnippets.group)
  - [From name](https://ai.google.dev/api/caching#body.codeSnippets.group_1)
  - [From chat](https://ai.google.dev/api/caching#body.codeSnippets.group_2)

Creates CachedContent resource.

### Endpoint

post `https://generativelanguage.googleapis.com/v1beta/cachedContents`   

### Request body

The request body contains an instance of `https://ai.google.dev/api/caching#CachedContent`.
Fields `contents[]` ``object (`Content`)`` Optional. Input only. Immutable. The content to cache.
`tools[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.Tool`)`` Optional. Input only. Immutable. A list of `Tools` the model may use to generate the next response
`expiration` `Union type` Specifies when this resource will expire. `expiration` can be only one of the following: `expireTime` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#timestamp` format)`` Timestamp in UTC of when this resource is considered expired. This is *always* provided on output, regardless of what was sent on input.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: `"2014-10-02T15:01:23Z"`, `"2014-10-02T15:01:23.045123456Z"` or `"2014-10-02T15:01:23+05:30"`.
`ttl` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#duration` format)`` Input only. New TTL for this resource, input only.

A duration in seconds with up to nine fractional digits, ending with '`s`'. Example: `"3.5s"`.
`displayName` `string` Optional. Immutable. The user-generated meaningful display name of the cached content. Maximum 128 Unicode characters.
`model` `string` Required. Immutable. The name of the `Model` to use for cached content Format: `models/{model}`
`systemInstruction` ``object (`Content`)`` Optional. Input only. Immutable. Developer set system instruction. Currently text only.
`toolConfig` ``object (`https://ai.google.dev/api/caching#ToolConfig`)`` Optional. Input only. Immutable. Tool config. This config is shared for all tools.

### Example request

### Basic

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

### Shell

    wget https://storage.googleapis.com/generativeai-downloads/data/a11.txt
    echo '{
      "model": "models/gemini-1.5-flash-001",
      "contents":[
        {
          "parts":[
            {
              "inline_data": {
                "mime_type":"text/plain",
                "data": "'$(base64 $B64FLAGS a11.txt)'"
              }
            }
          ],
        "role": "user"
        }
      ],
      "systemInstruction": {
        "parts": [
          {
            "text": "You are an expert at analyzing transcripts."
          }
        ]
      },
      "ttl": "300s"
    }' > request.json

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/cachedContents?key=$GEMINI_API_KEY" \
     -H 'Content-Type: application/json' \
     -d @request.json \
     > cache.json

    CACHE_NAME=$(cat cache.json | grep '"name":' | cut -d '"' -f 4 | head -n 1)

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=$GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
          "contents": [
            {
              "parts":[{
                "text": "Please summarize this transcript"
              }],
              "role": "user"
            },
          ],
          "cachedContent": "'$CACHE_NAME'"
        }'

### From name

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
    cache_name = cache.name  # Save the name for later

    # Later retrieve the cache
    cache = client.caches.get(name=cache_name)
    response = client.models.generate_content(
        model=model_name,
        contents="Find a lighthearted moment from this transcript",
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
    const cacheName = cache.name; // Save the name for later

    // Later retrieve the cache
    const retrievedCache = await ai.caches.get({ name: cacheName });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Find a lighthearted moment from this transcript",
      config: { cachedContent: retrievedCache.name },
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
    	Contents:          contents,
    	SystemInstruction: genai.NewContentFromText(
    		"You are an expert analyzing transcripts.", genai.RoleUser,
    	),
    })
    if err != nil {
    	log.Fatal(err)
    }
    cacheName := cache.Name

    // Later retrieve the cache.
    cache, err = client.Caches.Get(ctx, cacheName, &genai.GetCachedContentConfig{})
    if err != nil {
    	log.Fatal(err)
    }

    response, err := client.Models.GenerateContent(
    	ctx,
    	modelName,
    	genai.Text("Find a lighthearted moment from this transcript"),
    	&genai.GenerateContentConfig{
    		CachedContent: cache.Name,
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Println("Response from cache (create from name):")
    printResponse(response)

### From chat

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()
    model_name = "gemini-3.6-flash"
    system_instruction = "You are an expert analyzing transcripts."

    # Create a chat session with the given system instruction.
    chat = client.chats.create(
        model=model_name,
        config=types.GenerateContentConfig(system_instruction=system_instruction),
    )
    document = client.files.upload(file=media / "a11.txt")

    response = chat.send_message(
        message=["Hi, could you summarize this transcript?", document]
    )
    print("\n\nmodel:  ", response.text)
    response = chat.send_message(
        message=["Okay, could you tell me more about the trans-lunar injection"]
    )
    print("\n\nmodel:  ", response.text)

    # To cache the conversation so far, pass the chat history as the list of contents.
    cache = client.caches.create(
        model=model_name,
        config={
            "contents": chat.get_history(),
            "system_instruction": system_instruction,
        },
    )
    # Continue the conversation using the cached content.
    chat = client.chats.create(
        model=model_name,
        config=types.GenerateContentConfig(cached_content=cache.name),
    )
    response = chat.send_message(
        message="I didn't understand that last part, could you explain it in simpler language?"
    )
    print("\n\nmodel:  ", response.text)

### Node.js

    // Make sure to include the following import:
    // import {GoogleGenAI} from '@google/genai';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const modelName = "gemini-3.6-flash";
    const systemInstruction = "You are an expert analyzing transcripts.";

    // Create a chat session with the system instruction.
    const chat = ai.chats.create({
      model: modelName,
      config: { systemInstruction: systemInstruction },
    });
    const filePath = path.join(media, "a11.txt");
    const document = await ai.files.upload({
      file: filePath,
      config: { mimeType: "text/plain" },
    });
    console.log("Uploaded file name:", document.name);

    let response = await chat.sendMessage({
      message: createUserContent([
        "Hi, could you summarize this transcript?",
        createPartFromUri(document.uri, document.mimeType),
      ]),
    });
    console.log("\n\nmodel:", response.text);

    response = await chat.sendMessage({
      message: "Okay, could you tell me more about the trans-lunar injection",
    });
    console.log("\n\nmodel:", response.text);

    // To cache the conversation so far, pass the chat history as the list of contents.
    const chatHistory = chat.getHistory();
    const cache = await ai.caches.create({
      model: modelName,
      config: {
        contents: chatHistory,
        systemInstruction: systemInstruction,
      },
    });

    // Continue the conversation using the cached content.
    const chatWithCache = ai.chats.create({
      model: modelName,
      config: { cachedContent: cache.name },
    });
    response = await chatWithCache.sendMessage({
      message:
        "I didn't understand that last part, could you explain it in simpler language?",
    });
    console.log("\n\nmodel:", response.text);

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
    systemInstruction := "You are an expert analyzing transcripts."

    // Create initial chat with a system instruction.
    chat, err := client.Chats.Create(ctx, modelName, &genai.GenerateContentConfig{
    	SystemInstruction: genai.NewContentFromText(systemInstruction, genai.RoleUser),
    }, nil)
    if err != nil {
    	log.Fatal(err)
    }

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

    // Send first message with the transcript.
    parts := make([]genai.Part, 2)
    parts[0] = genai.Part{Text: "Hi, could you summarize this transcript?"}
    parts[1] = genai.Part{
    	FileData: &genai.FileData{
    		FileURI :      document.URI,
    		MIMEType: document.MIMEType,
    	},
    }

    // Send chat message.
    resp, err := chat.SendMessage(ctx, parts...)
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Println("\n\nmodel: ", resp.Text())

    resp, err = chat.SendMessage(
    	ctx, 
    	genai.Part{
    		Text: "Okay, could you tell me more about the trans-lunar injection",
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Println("\n\nmodel: ", resp.Text())

    // To cache the conversation so far, pass the chat history as the list of contents.
    cache, err := client.Caches.Create(ctx, modelName, &genai.CreateCachedContentConfig{
    	Contents:          chat.History(false),
    	SystemInstruction: genai.NewContentFromText(systemInstruction, genai.RoleUser),
    })
    if err != nil {
    	log.Fatal(err)
    }

    // Continue the conversation using the cached history.
    chat, err = client.Chats.Create(ctx, modelName, &genai.GenerateContentConfig{
    	CachedContent: cache.Name,
    }, nil)
    if err != nil {
    	log.Fatal(err)
    }

    resp, err = chat.SendMessage(
    	ctx, 
    	genai.Part{
    		Text: "I didn't understand that last part, could you explain it in simpler language?",
    	},
    )
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Println("\n\nmodel: ", resp.Text())

### Response body

If successful, the response body contains a newly created instance of `https://ai.google.dev/api/caching#CachedContent`.

## Method: cachedContents.list

- [Endpoint](https://ai.google.dev/api/caching#body.HTTP_TEMPLATE)
- [Query parameters](https://ai.google.dev/api/caching#body.QUERY_PARAMETERS)
- [Request body](https://ai.google.dev/api/caching#body.request_body)
- [Response body](https://ai.google.dev/api/caching#body.response_body)
  - [JSON representation](https://ai.google.dev/api/caching#body.ListCachedContentsResponse.SCHEMA_REPRESENTATION)
- [Authorization scopes](https://ai.google.dev/api/caching#body.aspect)

Lists CachedContents.

### Endpoint

get `https://generativelanguage.googleapis.com/v1beta/cachedContents`   

### Query parameters

`pageSize` `integer` Optional. The maximum number of cached contents to return. The service may return fewer than this value. If unspecified, some default (under maximum) number of items will be returned. The maximum value is 1000; values above 1000 will be coerced to 1000.
`pageToken` `string` Optional. A page token, received from a previous `cachedContents.list` call. Provide this to retrieve the subsequent page.

When paginating, all other parameters provided to `cachedContents.list` must match the call that provided the page token.

### Request body

The request body must be empty.

### Response body

Response with CachedContents list.

If successful, the response body contains data with the following structure:
Fields `cachedContents[]` ``object (`https://ai.google.dev/api/caching#CachedContent`)`` List of cached contents.
`nextPageToken` `string` A token, which can be sent as `pageToken` to retrieve the next page. If this field is omitted, there are no subsequent pages.

| JSON representation |
|---|
| ``` { "cachedContents": [ { object (`https://ai.google.dev/api/caching#CachedContent`) } ], "nextPageToken": string } ``` |

## Method: cachedContents.get

- [Endpoint](https://ai.google.dev/api/caching#body.HTTP_TEMPLATE)
- [Path parameters](https://ai.google.dev/api/caching#body.PATH_PARAMETERS)
- [Request body](https://ai.google.dev/api/caching#body.request_body)
- [Response body](https://ai.google.dev/api/caching#body.response_body)
- [Authorization scopes](https://ai.google.dev/api/caching#body.aspect)
- [Example request](https://ai.google.dev/api/caching#body.codeSnippets)
  - [Basic](https://ai.google.dev/api/caching#body.codeSnippets.group)

Reads CachedContent resource.

### Endpoint

get `https://generativelanguage.googleapis.com/v1beta/{name=cachedContents/*}`   

### Path parameters

`name` `string` Required. The resource name referring to the content cache entry. Format: `cachedContents/{id}` It takes the form `cachedContents/{cachedcontent}`.

### Request body

The request body must be empty.

### Example request

### Python

    from google import genai

    client = genai.Client()
    document = client.files.upload(file=media / "a11.txt")
    model_name = "gemini-3.6-flash"

    cache = client.caches.create(
        model=model_name,
        config={
            "contents": [document],
            "system_instruction": "You are an expert analyzing transcripts.",
        },
    )
    print(client.caches.get(name=cache.name))

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
    const retrievedCache = await ai.caches.get({ name: cache.name });
    console.log("Retrieved Cache:", retrievedCache);

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
    	Contents:          contents,
    	SystemInstruction: genai.NewContentFromText(
    		"You are an expert analyzing transcripts.", genai.RoleUser,
    	),
    })
    if err != nil {
    	log.Fatal(err)
    }

    cache, err = client.Caches.Get(ctx, cache.Name, &genai.GetCachedContentConfig{})
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Println("Retrieved cache:")
    fmt.Println(cache)

### Shell

    curl "https://generativelanguage.googleapis.com/v1beta/$CACHE_NAME?key=$GEMINI_API_KEY"

### Response body

If successful, the response body contains an instance of `https://ai.google.dev/api/caching#CachedContent`.

## Method: cachedContents.patch

- [Endpoint](https://ai.google.dev/api/caching#body.HTTP_TEMPLATE)
- [Path parameters](https://ai.google.dev/api/caching#body.PATH_PARAMETERS)
- [Query parameters](https://ai.google.dev/api/caching#body.QUERY_PARAMETERS)
- [Request body](https://ai.google.dev/api/caching#body.request_body)
- [Response body](https://ai.google.dev/api/caching#body.response_body)
- [Authorization scopes](https://ai.google.dev/api/caching#body.aspect)
- [Example request](https://ai.google.dev/api/caching#body.codeSnippets)
  - [Basic](https://ai.google.dev/api/caching#body.codeSnippets.group)

Updates CachedContent resource (only expiration is updatable).

### Endpoint

patch `https://generativelanguage.googleapis.com/v1beta/{cachedContent.name=cachedContents/*}`   
`PATCH https://generativelanguage.googleapis.com/v1beta/{cachedContent.name=cachedContents/*}`

### Path parameters

`cachedContent.name` `string` Output only. Identifier. The resource name referring to the cached content. Format: `cachedContents/{id}` It takes the form `cachedContents/{cachedcontent}`.

### Query parameters

`updateMask` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#field-mask` format)`` The list of fields to update.

This is a comma-separated list of fully qualified names of fields. Example: `"user.displayName,photo"`.

### Request body

The request body contains an instance of `https://ai.google.dev/api/caching#CachedContent`.
Fields `expiration` `Union type` Specifies when this resource will expire. `expiration` can be only one of the following: `expireTime` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#timestamp` format)`` Timestamp in UTC of when this resource is considered expired. This is *always* provided on output, regardless of what was sent on input.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: `"2014-10-02T15:01:23Z"`, `"2014-10-02T15:01:23.045123456Z"` or `"2014-10-02T15:01:23+05:30"`.
`ttl` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#duration` format)`` Input only. New TTL for this resource, input only.

A duration in seconds with up to nine fractional digits, ending with '`s`'. Example: `"3.5s"`.

### Example request

### Python

    from google import genai
    from google.genai import types
    import datetime

    client = genai.Client()
    document = client.files.upload(file=media / "a11.txt")
    model_name = "gemini-3.6-flash"

    cache = client.caches.create(
        model=model_name,
        config={
            "contents": [document],
            "system_instruction": "You are an expert analyzing transcripts.",
        },
    )

    # Update the cache's time-to-live (ttl)
    ttl = f"{int(datetime.timedelta(hours=2).total_seconds())}s"
    client.caches.update(
        name=cache.name, config=types.UpdateCachedContentConfig(ttl=ttl)
    )
    print(f"After update:\n {cache}")

    # Alternatively, update the expire_time directly
    # Update the expire_time directly in valid RFC 3339 format (UTC with a "Z" suffix)
    expire_time = (
        (
            datetime.datetime.now(datetime.timezone.utc)
            + datetime.timedelta(minutes=15)
        )
        .isoformat()
        .replace("+00:00", "Z")
    )
    client.caches.update(
        name=cache.name,
        config=types.UpdateCachedContentConfig(expire_time=expire_time),
    )

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

    let cache = await ai.caches.create({
      model: modelName,
      config: {
        contents: contents,
        systemInstruction: "You are an expert analyzing transcripts.",
      },
    });

    // Update the cache's time-to-live (ttl)
    const ttl = `${2 * 3600}s`; // 2 hours in seconds
    cache = await ai.caches.update({
      name: cache.name,
      config: { ttl },
    });
    console.log("After update (TTL):", cache);

    // Alternatively, update the expire_time directly (in RFC 3339 format with a "Z" suffix)
    const expireTime = new Date(Date.now() + 15 * 60000)
      .toISOString()
      .replace(/\.\d{3}Z$/, "Z");
    cache = await ai.caches.update({
      name: cache.name,
      config: { expireTime: expireTime },
    });
    console.log("After update (expire_time):", cache);

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
    	Contents:          contents,
    	SystemInstruction: genai.NewContentFromText(
    		"You are an expert analyzing transcripts.", genai.RoleUser,
    	),
    })
    if err != nil {
    	log.Fatal(err)
    }

    _, err = client.Caches.Delete(ctx, cache.Name, &genai.DeleteCachedContentConfig{})
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Println("Cache deleted:", cache.Name)

### Shell

    curl -X PATCH "https://generativelanguage.googleapis.com/v1beta/$CACHE_NAME?key=$GEMINI_API_KEY" \
     -H 'Content-Type: application/json' \
     -d '{"ttl": "600s"}'

### Response body

If successful, the response body contains an instance of `https://ai.google.dev/api/caching#CachedContent`.

## Method: cachedContents.delete

- [Endpoint](https://ai.google.dev/api/caching#body.HTTP_TEMPLATE)
- [Path parameters](https://ai.google.dev/api/caching#body.PATH_PARAMETERS)
- [Request body](https://ai.google.dev/api/caching#body.request_body)
- [Response body](https://ai.google.dev/api/caching#body.response_body)
- [Authorization scopes](https://ai.google.dev/api/caching#body.aspect)
- [Example request](https://ai.google.dev/api/caching#body.codeSnippets)
  - [Basic](https://ai.google.dev/api/caching#body.codeSnippets.group)

Deletes CachedContent resource.

### Endpoint

delete `https://generativelanguage.googleapis.com/v1beta/{name=cachedContents/*}`   

### Path parameters

`name` `string` Required. The resource name referring to the content cache entry Format: `cachedContents/{id}` It takes the form `cachedContents/{cachedcontent}`.

### Request body

The request body must be empty.

### Example request

### Python

    from google import genai

    client = genai.Client()
    document = client.files.upload(file=media / "a11.txt")
    model_name = "gemini-3.6-flash"

    cache = client.caches.create(
        model=model_name,
        config={
            "contents": [document],
            "system_instruction": "You are an expert analyzing transcripts.",
        },
    )
    client.caches.delete(name=cache.name)

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
    await ai.caches.delete({ name: cache.name });
    console.log("Cache deleted:", cache.name);

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
    	Contents:          contents,
    	SystemInstruction: genai.NewContentFromText(
    		"You are an expert analyzing transcripts.", genai.RoleUser,
    	),
    })
    if err != nil {
    	log.Fatal(err)
    }

    _, err = client.Caches.Delete(ctx, cache.Name, &genai.DeleteCachedContentConfig{})
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Println("Cache deleted:", cache.Name)

### Shell

    curl -X DELETE "https://generativelanguage.googleapis.com/v1beta/$CACHE_NAME?key=$GEMINI_API_KEY"

### Response body

If successful, the response body is an empty JSON object.

## REST Resource: cachedContents

- [Resource: CachedContent](https://ai.google.dev/api/caching#CachedContent)
  - [JSON representation](https://ai.google.dev/api/caching#CachedContent.SCHEMA_REPRESENTATION)
- [ToolConfig](https://ai.google.dev/api/caching#ToolConfig)
  - [JSON representation](https://ai.google.dev/api/caching#ToolConfig.SCHEMA_REPRESENTATION)
- [FunctionCallingConfig](https://ai.google.dev/api/caching#FunctionCallingConfig)
  - [JSON representation](https://ai.google.dev/api/caching#FunctionCallingConfig.SCHEMA_REPRESENTATION)
- [Mode](https://ai.google.dev/api/caching#Mode)
- [RetrievalConfig](https://ai.google.dev/api/caching#RetrievalConfig)
  - [JSON representation](https://ai.google.dev/api/caching#RetrievalConfig.SCHEMA_REPRESENTATION)
- [LatLng](https://ai.google.dev/api/caching#LatLng)
  - [JSON representation](https://ai.google.dev/api/caching#LatLng.SCHEMA_REPRESENTATION)
- [UsageMetadata](https://ai.google.dev/api/caching#UsageMetadata)
  - [JSON representation](https://ai.google.dev/api/caching#UsageMetadata.SCHEMA_REPRESENTATION)
- [Methods](https://ai.google.dev/api/caching#METHODS_SUMMARY)

## Resource: CachedContent

Content that has been preprocessed and can be used in subsequent request to GenerativeService.

Cached content can be only used with model it was created for.
Fields `contents[]` ``object (`Content`)`` Optional. Input only. Immutable. The content to cache.
`tools[]` ``object (`https://ai.google.dev/api/generate-content#v1beta.Tool`)`` Optional. Input only. Immutable. A list of `Tools` the model may use to generate the next response
`createTime` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#timestamp` format)`` Output only. Creation time of the cache entry.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: `"2014-10-02T15:01:23Z"`, `"2014-10-02T15:01:23.045123456Z"` or `"2014-10-02T15:01:23+05:30"`.
`updateTime` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#timestamp` format)`` Output only. When the cache entry was last updated in UTC time.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: `"2014-10-02T15:01:23Z"`, `"2014-10-02T15:01:23.045123456Z"` or `"2014-10-02T15:01:23+05:30"`.
`usageMetadata` ``object (`https://ai.google.dev/api/caching#UsageMetadata`)`` Output only. Metadata on the usage of the cached content.
`expiration` `Union type` Specifies when this resource will expire. `expiration` can be only one of the following: `expireTime` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#timestamp` format)`` Timestamp in UTC of when this resource is considered expired. This is *always* provided on output, regardless of what was sent on input.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: `"2014-10-02T15:01:23Z"`, `"2014-10-02T15:01:23.045123456Z"` or `"2014-10-02T15:01:23+05:30"`.
`ttl` ``string (`https://protobuf.dev/reference/protobuf/google.protobuf#duration` format)`` Input only. New TTL for this resource, input only.

A duration in seconds with up to nine fractional digits, ending with '`s`'. Example: `"3.5s"`.
`name` `string` Output only. Identifier. The resource name referring to the cached content. Format: `cachedContents/{id}`
`displayName` `string` Optional. Immutable. The user-generated meaningful display name of the cached content. Maximum 128 Unicode characters.
`model` `string` Required. Immutable. The name of the `Model` to use for cached content Format: `models/{model}`
`systemInstruction` ``object (`Content`)`` Optional. Input only. Immutable. Developer set system instruction. Currently text only.
`toolConfig` ``object (`https://ai.google.dev/api/caching#ToolConfig`)`` Optional. Input only. Immutable. Tool config. This config is shared for all tools.

| JSON representation |
|---|
| ``` { "contents": [ { object (`Content`) } ], "tools": [ { object (`https://ai.google.dev/api/generate-content#v1beta.Tool`) } ], "createTime": string, "updateTime": string, "usageMetadata": { object (`https://ai.google.dev/api/caching#UsageMetadata`) }, // expiration "expireTime": string, "ttl": string // Union type "name": string, "displayName": string, "model": string, "systemInstruction": { object (`Content`) }, "toolConfig": { object (`https://ai.google.dev/api/caching#ToolConfig`) } } ``` |

## ToolConfig

The Tool configuration containing parameters for specifying `Tool` use in the request.
Fields `functionCallingConfig` ``object (`https://ai.google.dev/api/caching#FunctionCallingConfig`)`` Optional. Function calling config.
`retrievalConfig` ``object (`https://ai.google.dev/api/caching#RetrievalConfig`)`` Optional. Retrieval config.
`includeServerSideToolInvocations` `boolean` Optional. If true, the API response will include the server-side tool calls and responses within the `Content` message. This allows clients to observe the server's tool interactions.

| JSON representation |
|---|
| ``` { "functionCallingConfig": { object (`https://ai.google.dev/api/caching#FunctionCallingConfig`) }, "retrievalConfig": { object (`https://ai.google.dev/api/caching#RetrievalConfig`) }, "includeServerSideToolInvocations": boolean } ``` |

## FunctionCallingConfig

Configuration for specifying function calling behavior.
Fields `mode` ``enum (`https://ai.google.dev/api/caching#Mode`)`` Optional. Specifies the mode in which function calling should execute. If unspecified, the default value will be set to AUTO.
`allowedFunctionNames[]` `string` Optional. A set of function names that, when provided, limits the functions the model will call.

This should only be set when the Mode is ANY or VALIDATED. Function names should match \[FunctionDeclaration.name\]. When set, model will predict a function call from only allowed function names.

| JSON representation |
|---|
| ``` { "mode": enum (`https://ai.google.dev/api/caching#Mode`), "allowedFunctionNames": [ string ] } ``` |

## Mode

Defines the execution behavior for function calling by defining the execution mode.

| Enums ||
|---|---|
| `MODE_UNSPECIFIED` | Unspecified function calling mode. This value should not be used. |
| `AUTO` | Default model behavior, model decides to predict either a function call or a natural language response. |
| `ANY` | Model is constrained to always predicting a function call only. If "allowedFunctionNames" are set, the predicted function call will be limited to any one of "allowedFunctionNames", else the predicted function call will be any one of the provided "functionDeclarations". |
| `NONE` | Model will not predict any function call. Model behavior is same as when not passing any function declarations. |
| `VALIDATED` | Model decides to predict either a function call or a natural language response, but will validate function calls with constrained decoding. If "allowedFunctionNames" are set, the predicted function call will be limited to any one of "allowedFunctionNames", else the predicted function call will be any one of the provided "functionDeclarations". |

## RetrievalConfig

Retrieval config.
Fields `latLng` ``object (`https://ai.google.dev/api/caching#LatLng`)`` Optional. The location of the user.
`languageCode` `string` Optional. The language code of the user. Language code for content. Use language tags defined by [BCP47](https://www.rfc-editor.org/rfc/bcp/bcp47.txt).

| JSON representation |
|---|
| ``` { "latLng": { object (`https://ai.google.dev/api/caching#LatLng`) }, "languageCode": string } ``` |

## LatLng

An object that represents a latitude/longitude pair. This is expressed as a pair of doubles to represent degrees latitude and degrees longitude. Unless specified otherwise, this object must conform to the [WGS84 standard](https://en.wikipedia.org/wiki/World_Geodetic_System#1984_version). Values must be within normalized ranges.
Fields `latitude` `number` The latitude in degrees. It must be in the range \[-90.0, +90.0\].
`longitude` `number` The longitude in degrees. It must be in the range \[-180.0, +180.0\].

| JSON representation |
|---|
| ``` { "latitude": number, "longitude": number } ``` |

## UsageMetadata

Metadata on the usage of the cached content.
Fields `totalTokenCount` `integer` Total number of tokens that the cached content consumes.

| JSON representation |
|---|
| ``` { "totalTokenCount": integer } ``` |