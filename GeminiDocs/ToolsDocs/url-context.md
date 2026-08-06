The URL context tool lets you provide additional context to the models in the
form of URLs. By including URLs in your request, the model will access
the content from those pages (as long as it's not a URL type listed in the
[limitations section](https://ai.google.dev/gemini-api/docs/url-context#limitations)) to inform
and enhance its response.

The URL context tool is useful for tasks like the following:

- **Extract Data**: Pull specific info like prices, names, or key findings from multiple URLs.
- **Compare Documents**: Analyze multiple reports, articles, or PDFs to identify differences and track trends.
- **Synthesize \& Create Content**: Combine information from several source URLs to generate accurate summaries, blog posts, or reports.
- **Analyze Code \& Docs**: Point to a GitHub repository or technical documentation to explain code, generate setup instructions, or answer questions.

The following example shows how to compare two recipes from different websites.

### Python

    # This will only work for SDK newer than 2.0.0
    from google import genai

    client = genai.Client()

    url1 = "https://www.foodnetwork.com/recipes/ina-garten/perfect-roast-chicken-recipe-1940592"
    url2 = "https://www.allrecipes.com/recipe/21151/simple-whole-roast-chicken/"

    interaction = client.interactions.create(
        model="gemini-3.6-flash",
        input=f"Compare the ingredients and cooking times from the recipes at {url1} and {url2}",
        tools=[{"type": "url_context"}]
    )

    # Print the model's text response and its source annotations
    for step in interaction.steps:
        if step.type == "model_output":
            for content_block in step.content:
                if content_block.type == "text":
                    print(content_block.text)
                    if content_block.annotations:
                        print("\nSources:")
                        for annotation in content_block.annotations:
                            if annotation.type == "url_citation":
                                print(f"  - {annotation.title}: {annotation.url}")

### Javascript

    // This will only work for SDK newer than 2.0.0
    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    async function main() {
      const interaction = await client.interactions.create({
        model: "gemini-3.6-flash",
        input: "Compare the ingredients and cooking times from the recipes at https://www.foodnetwork.com/recipes/ina-garten/perfect-roast-chicken-recipe-1940592 and https://www.allrecipes.com/recipe/21151/simple-whole-roast-chicken/",
        tools: [{ type: "url_context" }]
      });

      // Print the model's text response and its source annotations
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          for (const contentBlock of step.content) {
            if (contentBlock.type === 'text') {
              console.log(contentBlock.text);
              if (contentBlock.annotations) {
                console.log("\nSources:");
                for (const annotation of contentBlock.annotations) {
                  if (annotation.type === 'url_citation') {
                    console.log(`  - ${annotation.title}: ${annotation.url}`);
                  }
                }
              }
            }
          }
        }
      }
    }

    await main();

### REST

    # Specifies the API revision to avoid breaking changes when they become default
    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
          "model": "gemini-3.6-flash",
          "input": "Compare the ingredients and cooking times from the recipes at https://www.foodnetwork.com/recipes/ina-garten/perfect-roast-chicken-recipe-1940592 and https://www.allrecipes.com/recipe/21151/simple-whole-roast-chicken/",
          "tools": [{"type": "url_context"}]
      }'

## How it works

The URL Context tool uses a two-step retrieval process to
balance speed, cost, and access to fresh data. When you provide a URL, the tool
first attempts to fetch the content from an internal index cache. This acts as a
highly optimized cache. If a URL is not available in the index (for example, if
it's a very new page), the tool automatically falls back to do a live fetch.
This directly accesses the URL to retrieve its content in real-time.

## Combining with other tools

You can combine the URL context tool with other tools to create more powerful
workflows.

[Gemini 3 models](https://ai.google.dev/gemini-api/docs/url-context#supported-models) support combining built-in tools
(like URL Context) with custom tools (function calling). Learn more on the
[tool combinations](https://ai.google.dev/gemini-api/docs/tool-combination) page.

### Grounding with search

When both URL context and
[Grounding with Google Search](https://ai.google.dev/gemini-api/docs/grounding) are enabled,
the model can use its search capabilities to find
relevant information online and then use the URL context tool to get a more
in-depth understanding of the pages it finds. This approach is powerful for
prompts that require both broad searching and deep analysis of specific pages.

### Python

    # This will only work for SDK newer than 2.0.0
    from google import genai

    client = genai.Client()

    interaction = client.interactions.create(
        model="gemini-3.6-flash",
        input="Give me three day events schedule based on YOUR_URL. Also let me know what needs to taken care of considering weather and commute.",
        tools=[
            {"type": "url_context"},
            {"type": "google_search"}
        ]
    )

    for step in interaction.steps:
        if step.type == "model_output":
            for content_block in step.content:
                if content_block.type == "text":
                    print(content_block.text)

### Javascript

    // This will only work for SDK newer than 2.0.0
    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    async function main() {
      const interaction = await client.interactions.create({
        model: "gemini-3.6-flash",
        input: "Give me three day events schedule based on YOUR_URL. Also let me know what needs to taken care of considering weather and commute.",
        tools: [
          { type: "url_context" },
          { type: "google_search" }
        ]
      });

      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          for (const contentBlock of step.content) {
            if (contentBlock.type === 'text') console.log(contentBlock.text);
          }
        }
      }
    }

    await main();

### REST

    # Specifies the API revision to avoid breaking changes when they become default
    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
          "model": "gemini-3.6-flash",
          "input": "Give me three day events schedule based on YOUR_URL. Also let me know what needs to taken care of considering weather and commute.",
          "tools": [
              {"type": "url_context"},
              {"type": "google_search"}
          ]
      }'

## Understanding the response

When the model uses the URL context tool, its text response includes inline
`url_citation` annotations on the text content block. Each annotation links a
segment of the response text (via `start_index` and `end_index`) to the source
URL it was derived from. This is the primary way to surface citations in your
application --- see the [main example above](https://ai.google.dev/gemini-api/docs/url-context#get-started) for how to extract them.

The response also includes a `url_context_result` step with metadata about each
URL retrieval attempt (status, retrieved URL). This is mainly useful for
debugging.

### Safety checks

The system performs a content moderation check on URLs to confirm
they meet safety standards. If a URL fails this check, the corresponding
`url_context_result` step will show a `status` of `"unsafe"`.

### Token count

The content retrieved from the URLs you specify in your prompt is counted
as part of the input tokens. You can see the token count in the
`usage` object of the interaction. The following is an example:

    'usage': {
      'output_tokens': 45,
      'input_tokens': 27,
      'input_tokens_details': [{'modality': 'TEXT', 'token_count': 27}],
      'thoughts_tokens': 31,
      'tool_use_input_tokens': 10309,
      'tool_use_input_tokens_details': [{'modality': 'TEXT', 'token_count': 10309}],
      'total_tokens': 10412
    }

Price per token depends on the model used, see the
[pricing](https://ai.google.dev/gemini-api/docs/pricing) page for details.

## Supported models

| Model | URL Context |
|---|---|
| [Gemini 3.6 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash) | ✔️ |
| [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) | ✔️ |
| [Gemini 3.5 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash) | ✔️ |
| [Gemini 3.1 Pro Preview](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview) | ✔️ |
| [Gemini 3.1 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) | ✔️ |
| [Gemini 3 Flash Preview](https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview) | ✔️ |
| [Gemini 2.5 Pro](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro) | ✔️ |
| [Gemini 2.5 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash) | ✔️ |
| [Gemini 2.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite) | ✔️ |

## Best Practices

- **Provide specific URLs**: For the best results, provide direct URLs to the content you want the model to analyze. The model will only retrieve content from the URLs you provide, not any content from nested links.
- **Check for accessibility**: Verify that the URLs you provide don't lead to pages that require a login or are behind a paywall.
- **Use the complete URL**: Provide the full URL, including the protocol (e.g., https://www.google.com instead of just google.com).

## Limitations

- Request limit: The tool can process up to 20 URLs per request.
- URL content size: The maximum size for content retrieved from a single URL is 34MB.
- Public accessibility: The URLs must be publicly accessible on the web. Localhost addresses (e.g., localhost, 127.0.0.1), private networks, and tunneling services (e.g., ngrok, pinggy) are not supported.

### Supported and unsupported content types

The tool can extract content from URLs with the following content types:

- Text (text/html, application/json, text/plain, text/xml, text/css, text/javascript , text/csv, text/rtf)
- Image (image/png, image/jpeg, image/bmp, image/webp)
- PDF (application/pdf)

The following content types are **not** supported:

- Paywalled content
- YouTube videos (See [video understanding](https://ai.google.dev/gemini-api/docs/video-understanding#youtube) to learn how to process YouTube URLs)
- Google workspace files like Google docs or spreadsheets
- Video and audio files