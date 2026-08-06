Grounding with Google Search connects the Gemini model to real-time web content
and works with all available languages. This allows
Gemini to provide more accurate answers and cite verifiable sources beyond its
knowledge cutoff.

Grounding helps you build applications that can:

- **Increase factual accuracy:** Reduce model hallucinations by basing responses on real-world information.
- **Access real-time information:** Answer questions about recent events and topics.
- **Provide citations:** Build user trust by showing the sources for the
  model's claims.

### Python

    from google import genai

    client = genai.Client()

    interaction = client.interactions.create(
        model="gemini-3.6-flash",
        input="Who won the euro 2024?",
        tools=[{"type": "google_search"}]
    )

    print(interaction.output_text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const client = new GoogleGenAI({});

    const interaction = await client.interactions.create({
        model: "gemini-3.6-flash",
        input: "Who won the euro 2024?",
        tools: [{ type: "google_search" }]
    });

    console.log(interaction.output_text);

### REST

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "model": "gemini-3.6-flash",
        "input": "Who won the euro 2024?",
        "tools": [{"type": "google_search"}]
      }'

## How grounding with Google Search works

When you enable the `google_search` tool, the model handles the entire workflow
of searching, processing, and citing information automatically.

![grounding-overview](https://ai.google.dev/static/gemini-api/docs/images/google-search-tool-overview.png)

1. **User Prompt:** Your application sends a user's prompt to the Gemini API with the `google_search` tool enabled.
2. **Prompt Analysis:** The model analyzes the prompt and determines if a Google Search can improve the answer.
3. **Google Search:** If needed, the model automatically generates one or multiple search queries and executes them.
4. **Search Results Processing:** The model processes the search results, synthesizes the information, and formulates a response.
5. **Grounded Response:** The API returns a final, user-friendly response that is grounded in the search results. This response includes the model's text answer with inline `annotations` containing the citations, as well as `google_search_call` and `google_search_result` steps with the search queries and search suggestions.

## Understanding the grounding response

When a response is successfully grounded, the model's text output includes
inline `annotations` directly on the text content block. These annotations
provide citation information linking parts of the response to their sources.

    {
      "steps": [
        {
          "type": "thought",
          "summary": [
            {
              "type": "text",
              "text": "The user is asking for the winner of Euro 2024. I need to search for the result of the Euro 2024 final."
            }
          ],
          "signature": "CoMDAXLI2nynRYojJIy6B1Jh9os2crpWLfB0..."
        },
        {
          "type": "google_search_call",
          "arguments": {
            "queries": ["UEFA Euro 2024 winner"]
          }
        },
        {
          "type": "google_search_result",
          "call_id": "search_001",
          "result": [
            {
              "search_suggestions": "<!-- HTML and CSS for the search widget -->"
            }
          ]
        },
        {
          "type": "model_output",
          "content": [
            {
              "type": "text",
              "text": "Spain won Euro 2024, defeating England 2-1 in the final. This victory marks Spain's record fourth European Championship title.",
              "annotations": [
                {
                  "type": "url_citation",
                  "url": "https://www.aljazeera.com/sports/euro-2024-final",
                  "title": "aljazeera.com",
                  "start_index": 0,
                  "end_index": 56
                },
                {
                  "type": "url_citation",
                  "url": "https://www.uefa.com/euro2024/news/spain-wins-euro-2024",
                  "title": "uefa.com",
                  "start_index": 57,
                  "end_index": 124
                }
              ]
            }
          ]
        }
      ]
    }

The key fields in the response:

- `google_search_call` : Contains the search `queries` the model executed.
- `google_search_result` : Contains `search_suggestions`, an HTML snippet for rendering search suggestions in your UI. Full usage requirements are detailed in the [Terms of Service](https://ai.google.dev/gemini-api/terms#grounding-with-google-search).
- `text` with `annotations` : The model's synthesized answer with inline citations. Each `url_citation` annotation links a text segment (defined by `start_index` and `end_index`) to a source URL. This is the key to building inline citations.

Grounding with Google Search can also be used in combination with the [URL
context tool](https://ai.google.dev/gemini-api/docs/url-context) to ground responses in
both public web data and the specific URLs you provide.

## Attributing sources with inline citations

The API returns inline `url_citation` annotations on the text content block,
giving you complete control over how you display sources in your user interface.
Each annotation includes `start_index` and `end_index` to identify which part
of the text it cites. Here's how to extract and display them.

### Python

    for step in interaction.steps:
        if step.type == "model_output":
            for content_block in step.content:
                if content_block.type == "text":
                    print(content_block.text)
                    if content_block.annotations:
                        print("\nCitations:")
                        for annotation in content_block.annotations:
                            if annotation.type == "url_citation":
                                cited_text = content_block.text[annotation.start_index:annotation.end_index]
                                print(f"  [{annotation.title}]({annotation.url})")
                                print(f"    Cited text: \"{cited_text}\"")

### JavaScript

    for (const step of interaction.steps) {
      if (step.type === 'model_output') {
        for (const contentBlock of step.content) {
          if (contentBlock.type === 'text') {
            console.log(contentBlock.text);
            if (contentBlock.annotations) {
              console.log("\nCitations:");
              for (const annotation of contentBlock.annotations) {
                if (annotation.type === 'url_citation') {
                  const citedText = contentBlock.text.slice(annotation.startIndex, annotation.endIndex);
                  console.log(`  [${annotation.title}](${annotation.url})`);
                  console.log(`    Cited text: "${citedText}"`);
                }
              }
            }
          }
        }
      }
    }

The output will show the text followed by its citations:

    Spain won Euro 2024, defeating England 2-1 in the final. This victory marks Spain's record fourth European Championship title.

    Citations:
      [aljazeera.com](https://www.aljazeera.com/sports/euro-2024-final)
        Cited text: "Spain won Euro 2024, defeating England 2-1 in the final."
      [uefa.com](https://www.uefa.com/euro2024/news/spain-wins-euro-2024)
        Cited text: "This victory marks Spain's record fourth European Championship title."

## Pricing

When you use Grounding with Google Search with Gemini 3, your project is billed
for each search query that the model decides to execute. If the model decides to
execute multiple search queries to answer a single prompt (for example,
searching for `"UEFA Euro 2024 winner"` and `"Spain vs England Euro 2024 final
score"` within the same API call), this counts as two billable uses of the tool
for that request. For billing purposes, we ignore the empty web search queries
when counting unique queries. This billing model only applies to Gemini 3
models; when you use search grounding with Gemini 2.5 or older models, your
project is billed per prompt.

For detailed pricing information, see the [Gemini API pricing
page](https://ai.google.dev/gemini-api/docs/pricing).

## Supported models

You can find full capabilities on the [model
overview](https://ai.google.dev/gemini-api/docs/models) page.

| Model | Grounding with Google Search |
|---|---|
| Gemini 3.6 Flash | ✔️ |
| Gemini 3.5 Flash-Lite | ✔️ |
| Gemini 3.5 Flash | ✔️ |
| Gemini 3.1 Flash Image Preview | ✔️ |
| Gemini 3.1 Pro Preview | ✔️ |
| Gemini 3 Pro Image Preview | ✔️ |
| Gemini 3 Flash Preview | ✔️ |
| Gemini 2.5 Pro | ✔️ |
| Gemini 2.5 Flash | ✔️ |
| Gemini 2.5 Flash-Lite | ✔️ |
| Gemini 2.0 Flash | ✔️ |

> [!NOTE]
> **Note:** Older models use a `google_search_retrieval` tool. For all current models, use the `google_search` tool as shown in the examples.

## Supported tool combinations

You can use Grounding with Google Search with other tools like
[code execution](https://ai.google.dev/gemini-api/docs/code-execution),
[URL context](https://ai.google.dev/gemini-api/docs/url-context), and
[Grounding with Google Maps](https://ai.google.dev/gemini-api/docs/maps-grounding) (supported on
Gemini 3.5 Flash and later models) to power more complex use cases. Gemini 3
models also support combining these built-in tools with custom tools (function
calling). Learn more on the
[tool combinations](https://ai.google.dev/gemini-api/docs/tool-combination) page.

## What's next

- Learn about other available tools, like [Function Calling](https://ai.google.dev/gemini-api/docs/function-calling).
- Learn how to augment prompts with specific URLs using the [URL context tool](https://ai.google.dev/gemini-api/docs/url-context).