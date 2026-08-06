Grounding with Google Maps connects the generative capabilities of Gemini with
the rich, factual, and up-to-date data of Google Maps. This feature enables
developers to easily incorporate location-aware functionality into their
applications. When a user query has a context related to Maps data, the Gemini
model leverages Google Maps to provide factually accurate and fresh answers that
are relevant to the user's specified location or general area.

- **Accurate, location-aware responses:** Leverage Google Maps' extensive and current data for geographically specific queries.
- **Enhanced personalization:** Tailor recommendations and information based on user-provided locations.

## Get started

This example demonstrates how to integrate Grounding with Google Maps into your
application to provide accurate, location-aware responses to user queries. The
prompt asks for local recommendations with an optional user location, enabling
the Gemini model to use Google Maps data.

### Python

    # This will only work for SDK newer than 2.0.0
    from google import genai

    client = genai.Client()

    interaction = client.interactions.create(
        model="gemini-3.6-flash",
        input="What are the best Italian restaurants within a 15-minute walk from here?",
        tools=[{
            "type": "google_maps",
            "latitude": 34.050481,
            "longitude": -118.248526
        }]
    )

    # Print the model's text response and annotations
    for step in interaction.steps:
        if step.type == "model_output":
            for content_block in step.content:
                if content_block.type == "text":
                    print(content_block.text)
                    if content_block.annotations:
                        print("\nSources:")
                        for annotation in content_block.annotations:
                            if annotation.type == "place_citation":
                                print(f"  - {annotation.name}: {annotation.url}")

### JavaScript

    // This will only work for SDK newer than 2.0.0
    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const interaction = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: "What are the best Italian restaurants within a 15-minute walk from here?",
        tools: [{
          type: "google_maps",
          latitude: 34.050481,
          longitude: -118.248526
        }]
      });

      // Print the model's text response and annotations
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          for (const contentBlock of step.content) {
            if (contentBlock.type === 'text') {
              console.log(contentBlock.text);
              if (contentBlock.annotations) {
                console.log("\nSources:");
                for (const annotation of contentBlock.annotations) {
                  if (annotation.type === 'place_citation') {
                    console.log(`  - {annotation.name}: {annotation.url}`);
                  }
                }
              }
            }
          }
        }
      }
    }

    main();

### REST

    # Specifies the API revision to avoid breaking changes when they become default
    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
        "model": "gemini-3.6-flash",
        "input": "What are the best Italian restaurants within a 15-minute walk from here?",
        "tools": [{
          "type": "google_maps",
          "latitude": 34.050481,
          "longitude": -118.248526
        }]
      }'

## How Grounding with Google Maps works

Grounding with Google Maps integrates the Gemini API with the Google Geo
ecosystem by using the Maps API as a grounding source. When a user's query
contains geographical context, the Gemini model can invoke the Grounding with
Google Maps tool. The model can then generate responses grounded in Google Maps
data relevant to the provided location.

The process typically involves:

1. **User query:** A user submits a query to your application, potentially including geographical context (e.g., "coffee shops near me," "museums in San Francisco").
2. **Tool invocation:** The Gemini model, recognizing the geographical intent, invokes the Grounding with Google Maps tool. This tool can optionally be provided with the user's `latitude` and `longitude`. The tool is a textual search tool and behaves similarly to searching on Maps, in that local queries ("near me") will use the coordinates, while specific or non-local queries are unlikely to be influenced by the explicit location.
3. **Data retrieval:** The Grounding with Google Maps service queries Google Maps for relevant information (e.g., places, reviews, photos, addresses, opening hours).
4. **Grounded generation:** The retrieved Maps data is used to inform the Gemini model's response, ensuring factual accuracy and relevance.
5. **Response \& annotations:** The model returns a text response with inline annotations linking to Google Maps sources, allowing developers to display citations.

## Why and when to use Grounding with Google Maps

Grounding with Google Maps is ideal for applications that require accurate,
up-to-date, and location-specific information. It enhances the user experience
by providing relevant and personalized content backed by Google Maps' extensive
database of over 250 million places worldwide.

You should use Grounding with Google Maps when your application needs to:

- Provide complete and accurate responses to geo-specific questions.
- Build conversational trip planners and local guides.
- Recommend points of interest based on location and user preferences like restaurants or shops.
- Create location-aware experiences for social, retail, or food delivery services.

Grounding with Google Maps excels in use cases where proximity and current
factual data are critical, such as finding the "best coffee shop near me" or
getting directions.

## Use cases

Grounding with Google Maps supports a variety of location-aware use cases.

### Handling place-specific questions

Ask detailed questions about a specific place to get answers based on Google
user reviews and other Maps data.

### Python

    # This will only work for SDK newer than 2.0.0
    from google import genai

    client = genai.Client()

    interaction = client.interactions.create(
        model="gemini-3.6-flash",
        input="Is there a cafe near the corner of 1st and Main that has outdoor seating?",
        tools=[{
            "type": "google_maps",
            "latitude": 34.050481,
            "longitude": -118.248526
        }]
    )

    for step in interaction.steps:
        if step.type == "model_output":
            for content_block in step.content:
                if content_block.type == "text":
                    print(content_block.text)
                    if content_block.annotations:
                        print("\nSources:")
                        for annotation in content_block.annotations:
                            if annotation.type == "place_citation":
                                print(f"  - {annotation.name}: {annotation.url}")

### JavaScript

    // This will only work for SDK newer than 2.0.0
    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const interaction = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: "Is there a cafe near the corner of 1st and Main that has outdoor seating?",
        tools: [{
          type: "google_maps",
          latitude: 34.050481,
          longitude: -118.248526
        }]
      });

      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          for (const contentBlock of step.content) {
            if (contentBlock.type === 'text') {
              console.log(contentBlock.text);
              if (contentBlock.annotations) {
                console.log("\nSources:");
                for (const annotation of contentBlock.annotations) {
                  if (annotation.type === 'place_citation') {
                    console.log(`  - ${annotation.name}: ${annotation.url}`);
                  }
                }
              }
            }
          }
        }
      }
    }

    main();

### Providing location-based personalization

Get recommendations tailored to a user's preferences and a specific geographical
area.

### Python

    # This will only work for SDK newer than 2.0.0
    from google import genai

    client = genai.Client()

    interaction = client.interactions.create(
        model="gemini-3.6-flash",
        input="Which family-friendly restaurants near here have the best playground reviews?",
        tools=[{
            "type": "google_maps",
            "latitude": 30.2672,
            "longitude": -97.7431
        }]
    )

    for step in interaction.steps:
        if step.type == "model_output":
            for content_block in step.content:
                if content_block.type == "text":
                    print(content_block.text)
                    if content_block.annotations:
                        print("\nSources:")
                        for annotation in content_block.annotations:
                            if annotation.type == "place_citation":
                                print(f"  - {annotation.name}: {annotation.url}")

### JavaScript

    // This will only work for SDK newer than 2.0.0
    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const interaction = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: "Which family-friendly restaurants near here have the best playground reviews?",
        tools: [{
          type: "google_maps",
          latitude: 30.2672,
          longitude: -97.7431
        }]
      });

      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          for (const contentBlock of step.content) {
            if (contentBlock.type === 'text') {
              console.log(contentBlock.text);
              if (contentBlock.annotations) {
                console.log("\nSources:");
                for (const annotation of contentBlock.annotations) {
                  if (annotation.type === 'place_citation') {
                    console.log(`  - ${annotation.name}: ${annotation.url}`);
                  }
                }
              }
            }
          }
        }
      }
    }

    main();

### Assisting with itinerary planning

Generate multi-day plans with directions and information about various
locations, perfect for travel applications.

### Python

    # This will only work for SDK newer than 2.0.0
    from google import genai

    client = genai.Client()

    prompt = "Plan a day in San Francisco for me. I want to see the Golden Gate Bridge, visit a museum, and have a nice dinner."

    interaction = client.interactions.create(
        model="gemini-3.6-flash",
        input=prompt,
        tools=[{
            "type": "google_maps",
            "latitude": 37.78193,
            "longitude": -122.40476
        }]
    )
    # ... code to process response

### JavaScript

    // This will only work for SDK newer than 2.0.0
    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const interaction = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: "Plan a day in San Francisco for me. I want to see the Golden Gate Bridge, visit a museum, and have a nice dinner.",
        tools: [{
          type: "google_maps",
          latitude: 37.78193,
          longitude: -122.40476
        }]
      });
    }

    main();

### REST

    # Specifies the API revision to avoid breaking changes when they become default
    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
        "model": "gemini-3.6-flash",
        "input": "Plan a day in San Francisco for me. I want to see the Golden Gate Bridge, visit a museum, and have a nice dinner.",
        "tools": [{
          "type": "google_maps",
          "latitude": 37.78193,
          "longitude": -122.40476
        }]
      }'

## Service usage requirements

This section describes the service usage requirements for Grounding with Google
Maps.

### Inform the user about the use of Google Maps sources

With each Google Maps Grounded result, you'll receive source annotations on
the `model_output` step's content blocks that support each response. The following metadata is
returned:

- source url
- name

When presenting results from Grounding with Google Maps, you must specify the
associated Google Maps sources, and inform your users of the following:

- The Google Maps sources must immediately follow the generated content that the sources support. This generated content is also referred to as Google Maps Grounded Result.
- The Google Maps sources must be viewable within one user interaction.

### Display Google Maps sources with Google Maps links

For each source annotation, a link preview must
be generated following these requirements:

- Attribute each source to Google Maps following the Google Maps text [attribution guidelines](https://ai.google.dev/gemini-api/docs/maps-grounding#maps-attribution-guidelines).
- Display the source name provided in the response.
- Link to the source using the `url` from the annotation.

### Google Maps text attribution guidelines

When you attribute sources to Google Maps in text, follow these guidelines:

- Don't modify the text Google Maps in any way:
  - Don't change the capitalization of Google Maps.
  - Don't wrap Google Maps onto multiple lines.
  - Don't localize Google Maps into another language.
  - Prevent browsers from translating Google Maps by using the HTML attribute translate="no".

For more information about some of our Google Maps data providers and their
license terms, see the [Google Maps and Google Earth legal notices](https://www.google.com/help/legalnotices_maps/).

## Best practices

- **Provide user location:** For the most relevant and personalized responses, always include the `latitude` and `longitude` in your `google_maps` tool configuration when the user's location is known.
- **Inform End-Users:** Clearly inform your end-users that Google Maps data is being used to answer their queries, especially when the tool is enabled.
- **Toggle Off When Not Needed:** Grounding with Google Maps is off by default. Only enable it (`"tools": [{"type": "google_maps"}]`) when a query has a clear geographical context, to optimize performance and cost.

## Limitations

- Grounding with Google Maps currently only supports English language prompts and responses.
- The tool may not be available in all regions.
- Results may vary based on location accuracy and available Maps data.
- **Geographical Scope:** Grounding with Google Maps is globally available.
- **Default State:** The Grounding with Google Maps tool is off by default. You must explicitly enable it in your API requests.

## Pricing and rate limits

Grounding with Google Maps pricing differs depending on the model generation:

- **Gemini 3 models:** Your project is billed for each **search query** that the model decides to execute. A single **search prompt** (your API request to the model) might result in the model executing multiple search queries to find the necessary information. Each of these queries counts as a billable use of the tool.
- **Gemini 2.5 and older models:** Your project is billed per **search prompt**. A request is only billed if the prompt successfully returns at least one Google Maps grounded result, regardless of how many individual search queries the model performed internally to get that result.

For detailed pricing information, see the [Gemini API pricing page](https://ai.google.dev/gemini-api/docs/pricing).

## Supported models

The following models support Grounding with Google Maps:

| Model | Grounding with Google Maps |
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

## Supported tool combinations

You can use Grounding with Google Maps with other built-in tools like
[Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search) (supported on
Gemini 3.5 Flash and later models) to power more complex use cases. Gemini 3
models also support combining these built-in tools with custom tools (function
calling). Learn more on the
[tool combinations](https://ai.google.dev/gemini-api/docs/tool-combination) page.

## What's next

- Learn about other [available tools](https://ai.google.dev/gemini-api/docs/tools).
- To learn more about responsible AI best practices and Gemini API's safety filters, see [the Safety settings guide](https://ai.google.dev/gemini-api/docs/safety-settings).