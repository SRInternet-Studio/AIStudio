The Gemini Interactions API allows developers to build generative AI applications using Gemini models. Gemini is our most capable model, built from the ground up to be multimodal. It can generalize and seamlessly understand, operate across, and combine different types of information including language, images, audio, video, and code. You can use the Gemini API for use cases like reasoning across text and images, content generation, dialogue agents, summarization and classification systems, and more.
[View as markdown](https://ai.google.dev/static/api/interactions.md.txt) [View the OpenAPI Spec](https://ai.google.dev/static/api/interactions.openapi.json)

> [!NOTE]
> **Beta** : You are viewing the beta version of the Interactions API. Endpoints are under `/v1beta/`. The stable [v1 version](https://ai.google.dev/api/interactions-api-v1) is also available.

API version: v1beta [v1](https://ai.google.dev/api/interactions-api-v1)

## Creating an interaction

post https://generativelanguage.googleapis.com/v1beta/interactions Creates a new interaction.
- [Path / Query parameters](https://ai.google.dev/api/interactions-api#CreateInteraction.PATH_PARAMETERS)
- [Request body](https://ai.google.dev/api/interactions-api#CreateInteraction.request_body)
- [Response](https://ai.google.dev/api/interactions-api#CreateInteraction.response)

### Path / Query Parameters

api_version string (required) Which version of the API to use.

### Request body

The request body contains data with the following structure:
model ModelOption (optional) The name of the \`Model\` used for generating the interaction.   
**Required if \`agent\` is not provided.**
The model that will complete your prompt.\\n\\nSee \[models\](https://ai.google.dev/gemini-api/docs/models) for additional details.

#### Possible values

- `gemini-2.5-flash`

  Our first hybrid reasoning model which supports a 1M token context window and has thinking budgets.
- `gemini-2.5-pro`

  Our state-of-the-art multipurpose model, which excels at coding and complex reasoning tasks.
- `gemma-4-26b-a4b-it`

  Gemma 4 26B A4B IT
- `gemma-4-31b-it`

  Gemma 4 31B IT
- `gemini-flash-latest`

  Latest release of Gemini Flash
- `gemini-flash-lite-latest`

  Latest release of Gemini Flash-Lite
- `gemini-pro-latest`

  Latest release of Gemini Pro
- `gemini-2.5-flash-lite`

  Our smallest and most cost effective model, built for at scale usage.
- `gemini-2.5-flash-image`

  Our native image generation model, optimized for speed, flexibility, and contextual understanding. Text input and output is priced the same as 2.5 Flash.
- `gemini-3-flash-preview`

  Our most intelligent model built for speed, combining frontier intelligence with superior search and grounding.
- `gemini-3.1-pro-preview`

  Our latest SOTA reasoning model with unprecedented depth and nuance, and powerful multimodal understanding and coding capabilities.
- `gemini-3.1-pro-preview-customtools`

  Gemini 3.1 Pro Preview optimized for custom tool usage
- `gemini-3.1-flash-lite`

  Our most cost-efficient model, optimized for high-volume agentic tasks, translation, and simple data processing.
- `gemini-3-pro-image`

  Gemini 3 Pro Image
- `nano-banana-pro-preview`

  Gemini 3 Pro Image Preview
- `gemini-3.1-flash-image`

  Gemini 3.1 Flash Image.
- `gemini-3.5-flash`

  Our most intelligent model for sustained frontier performance in agentic and coding tasks.
- `gemini-3.6-flash`

  Our most intelligent model for sustained frontier performance in agentic and coding tasks.
- `lyria-3-clip-preview`

  Our low-latency, music generation model optimized for high-fidelity audio clips and precise rhythmic control.
- `lyria-3-pro-preview`

  Our advanced, full-song generative model with deep compositional understanding, optimized for precise structural control and complex transitions across diverse musical styles.
- `gemini-robotics-er-1.6-preview`

  Gemini Robotics-ER 1.6 Preview
agent AgentOption (optional) The name of the \`Agent\` used for generating the interaction.   
**Required if \`model\` is not provided.**
The agent to interact with.

#### Possible values

- `deep-research-pro-preview-12-2025`

  Gemini Deep Research Agent
- `deep-research-preview-04-2026`

  Gemini Deep Research Agent
- `deep-research-max-preview-04-2026`

  Gemini Deep Research Max Agent
- `antigravity-preview-05-2026`

  Use the Antigravity managed agent to perform multi-step tasks that require reasoning, file operations, and tool use.
input [Content](https://ai.google.dev/api/interactions-api#Resource:Content) or array ([Content](https://ai.google.dev/api/interactions-api#Resource:Content)) or array ([Step](https://ai.google.dev/api/interactions-api#Resource:Step)) or array (Turn) or string (required) The inputs for the interaction (common to both Model and Agent).
system_instruction string (optional) System instruction for the interaction.
tools array ([Tool](https://ai.google.dev/api/interactions-api#Resource:Tool)) (optional) A list of tool declarations the model may call during interaction.
response_format [ResponseFormat](https://ai.google.dev/api/interactions-api#Resource:ResponseFormat) or array ([ResponseFormat](https://ai.google.dev/api/interactions-api#Resource:ResponseFormat)) (optional) Enforces that the generated response is a JSON object that complies with the JSON schema specified in this field.
stream boolean (optional) Input only. Whether the interaction will be streamed.
store boolean (optional) Input only. Whether to store the response and request for later retrieval.
background boolean (optional) Input only. Whether to run the model interaction in the background.
generation_config GenerationConfig (optional) **Model Configuration**   
Configuration parameters for the model interaction.   
*Alternative to \`agent_config\`. Only applicable when \`model\` is set.*
Configuration parameters for model interactions.

#### Fields

max_output_tokens integer (optional) The maximum number of tokens to include in the response.
seed integer (optional) Seed used in decoding for reproducibility.
speech_config array (SpeechConfig) (optional) Configuration for speech interaction.
The configuration for speech interaction.

#### Fields

language string (optional) The language of the speech.
speaker string (optional) The speaker's name, it should match the speaker name given in the prompt.
voice string (optional) The voice of the speaker.
stop_sequences array (string) (optional) A list of character sequences that will stop output interaction.
thinking_level ThinkingLevel (optional) The level of thought tokens that the model should generate.
<br />

#### Possible values

- `minimal`

  Little to no thinking.
- `low`

  Low thinking level.
- `medium`

  Medium thinking level.
- `high`

  High thinking level.
thinking_summaries ThinkingSummaries (optional) Whether to include thought summaries in the response.
<br />

#### Possible values

- `auto`

  Auto thinking summaries.
- `none`

  No thinking summaries.
tool_choice [ToolChoiceConfig](https://ai.google.dev/api/interactions-api#Resource:ToolChoiceConfig) or enum (string) (optional) The tool choice configuration.

Possible
values:

- `auto`

  Auto tool choice.
- `any`

  Any tool choice.
- `none`

  No tool choice.
- `validated`

  Validated tool choice.
transcription_config TranscriptionConfig (optional) Optional. Configuration for speech recognition (transcription). If present, ASR is
enabled.
Configuration for speech recognition (transcription).

#### Fields

custom_vocabulary array (string) (optional) Optional. A list of custom vocabulary phrases to bias the speech recognition model
toward recognizing specific terms.
diarization_mode string (optional) Optional. Configures speaker diarization. Supported values: "speaker".
language_codes array (string) (optional) Optional. BCP-47 language codes providing hints about the languages present in the
audio. If omitted or empty, defaults to automatic language detection.
timestamp_granularities array (string) (optional) Optional. The granularity of timestamps to include in the transcription output.
Supported values: "word". If empty, no timestamps are generated.
video_config VideoConfig (optional) Configuration for video generation.
Configuration options for video generation.

#### Fields

task enum (string) (optional) Optional task mode for video generation. If not specified, the model
automatically determines the appropriate mode based on the provided text
prompt and input media.

Possible
values:

- `text_to_video`

  Generates video solely from a text prompt.
- `image_to_video`

  Generates video from one or two source images. The first image defines
  the starting frame, and the optional second image defines the ending
  frame.
- `reference_to_video`

  Generates video using reference media (such as images, audio, or video).
- `edit`

  Modifies an existing input video.
agent_config object (optional) **Agent Configuration**   
Configuration for the agent.   
*Alternative to \`generation_config\`. Only applicable when \`agent\` is set.*

#### Possible Types

Polymorphic discriminator: `type`
AntigravityAgentConfig Configuration for the Antigravity agent runtime.
Provides server-side control over the agent's execution environment
and tool configuration.
max_total_tokens string (optional) Max total tokens for the agent run.
model string (optional) The model to use for agent reasoning.
type object (required) No description provided.

Always set to `"antigravity"`.
CodeMenderAgentConfig Configuration for the CodeMender agent.
find_request FindRequest (optional) Parameters for finding vulnerabilities.
Request parameters specific to FIND sessions, used for discovering
vulnerabilities in a codebase.

#### Fields

description string (optional) Additional context or custom instructions provided by the user to guide
the vulnerability analysis.
finding_id string (optional) The identifier of a specific finding to verify. This is primarily used in
VERIFY mode to focus the agent's execution-based validation on a single
vulnerability.
mode enum (string) (optional) The mode of the find session.

Possible
values:

- `scan`

  Fast scan using only the initial classifier.
- `verify`

  Performs classification followed by detailed investigation.
source_files array (FileContent) (optional) A list of source files to provide as context for the scan.
Content of a single file in the codebase.

#### Fields

content string (optional) The UTF-8 encoded text content of the file.
path string (optional) The relative path of the file from the project root.
fix_request FixRequest (optional) Parameters for fixing vulnerabilities.
Request parameters specific to FIX sessions, used for generating and
validating security patches.

#### Fields

description string (optional) Additional context or custom instructions provided by the user to guide
the patch generation process.
finding_id string (optional) The identifier of the specific security finding to be remediated. This ID
maps to a previously discovered vulnerability.
source_files array (FileContent) (optional) A list of source files providing context for the remediation. These files
are typically the ones containing the identified vulnerability.
Content of a single file in the codebase.

#### Fields

content string (optional) The UTF-8 encoded text content of the file.
path string (optional) The relative path of the file from the project root.
model string (optional) The name of the model to use for the CodeMender agent. One
CodeMender session will only use one model.
session_config SessionConfig (optional) Optional session-specific configurations to override default agent
behavior.
The configuration of CodeMender sessions.

#### Fields

max_rounds integer (optional) The maximum number of interaction rounds the agent is allowed to perform
before reaching a timeout.
session_id string (optional) Parameter for grouping multiple interactions that belong to
the same CodeMender session.
type object (required) No description provided.

Always set to `"code-mender"`.
DeepResearchAgentConfig Configuration for the Deep Research agent.
collaborative_planning boolean (optional) Enables human-in-the-loop planning for the Deep Research agent. If set to
true, the Deep Research agent will provide a research plan in its response.
The agent will then proceed only if the user confirms the plan in the next
turn.
enable_bigquery_tool boolean (optional) Enables bigquery tool for the Deep Research agent.
thinking_summaries ThinkingSummaries (optional) Whether to include thought summaries in the response.
<br />

#### Possible values

- `auto`

  Auto thinking summaries.
- `none`

  No thinking summaries.
type object (required) No description provided.

Always set to `"deep-research"`.
visualization enum (string) (optional) Whether to include visualizations in the response.

Possible
values:

- `off`

  Do not include visualizations.
- `auto`

  Automatically include visualizations.
DynamicAgentConfig Configuration for dynamic agents.
type object (required) No description provided.

Always set to `"dynamic"`.
environment [EnvironmentConfig](https://ai.google.dev/api/interactions-api#Resource:EnvironmentConfig) or string (optional) The environment configuration for the interaction. Can be an object specifying remote environment sources or a string referencing an existing environment ID.
labels object (optional) The labels with user-defined metadata for the request.
previous_interaction_id string (optional) The ID of the previous interaction, if any.
response_modalities array (ResponseModality) (optional) The requested modalities of the response (TEXT, IMAGE, AUDIO).
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
safety_settings array (SafetySetting) (optional) Safety settings for the interaction.
A safety setting that affects the safety-blocking behavior.

A SafetySetting consists of a
harm category and a
threshold for that
category.

#### Fields

method enum (string) (optional) Optional. The method for blocking content. If not specified, the default
behavior is to use the probability score.

Possible
values:

- `severity`

  The harm block method uses both probability and severity scores.
- `probability`

  The harm block method uses the probability score.
threshold enum (string) (optional) Required. The threshold for blocking content. If the harm probability
exceeds this threshold, the content will be blocked.

Possible
values:

- `block_low_and_above`

  Block content with a low harm probability or higher.
- `block_medium_and_above`

  Block content with a medium harm probability or higher.
- `block_only_high`

  Block content with a high harm probability.
- `block_none`

  Do not block any content, regardless of its harm probability.
- `off`

  Turn off the safety filter entirely.
type HarmCategory (optional) Required. The type of harm category to be blocked.
<br />

#### Possible values

- `hate_speech`

  Content that promotes violence or incites hatred against individuals or
  groups based on certain attributes.
- `dangerous_content`

  Content that promotes, facilitates, or enables dangerous activities.
- `harassment`

  Abusive, threatening, or content intended to bully, torment, or ridicule.
- `sexually_explicit`

  Content that contains sexually explicit material.
- `civic_integrity`

  Deprecated: Election filter is not longer supported.
  The harm category is civic integrity.
- `image_hate`

  Images that contain hate speech.
- `image_dangerous_content`

  Images that contain dangerous content.
- `image_harassment`

  Images that contain harassment.
- `image_sexually_explicit`

  Images that contain sexually explicit content.
- `jailbreak`

  Prompts designed to bypass safety filters.
service_tier ServiceTier (optional) The service tier for the interaction.
<br />

#### Possible values

- `flex`

  Flex service tier.
- `standard`

  Standard service tier.
- `priority`

  Priority service tier.
webhook_config WebhookConfig (optional) Optional. Webhook configuration for receiving notifications when the
interaction completes.
Message for configuring webhook events for a request.

#### Fields

uris array (string) (optional) Optional. If set, these webhook URIs will be used for webhook events instead of the
registered webhooks.
user_metadata object (optional) Optional. The user metadata that will be returned on each event emission to the
webhooks.

### Response

Returns an [Interaction](https://ai.google.dev/api/interactions-api#Resource:Interaction) resource.

### Simple Request

<iframe src="https:///frame/api/interactions-api_57fc2cb43a80a8bbc0637447b4330524259ab69e2efad22af50c6a1426044ff7.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

#### Example Response

```json
{
  "created": "2025-11-26T12:25:15Z",
  "id": "v1_ChdPU0F4YWFtNkFwS2kxZThQZ05lbXdROBIXT1NBeGFhbTZBcEtpMWU4UGdOZW13UTg",
  "model": "gemini-3.6-flash",
  "object": "interaction",
  "status": "completed",
  "steps": [
    {
      "type": "model_output",
      "content": [
        {
          "type": "text",
          "text": "Hello! I'm functioning perfectly and ready to assist you.\n\nHow are you doing today?"
        }
      ]
    }
  ],
  "updated": "2025-11-26T12:25:15Z",
  "usage": {
    "input_tokens_by_modality": [
      {
        "modality": "text",
        "tokens": 7
      }
    ],
    "total_cached_tokens": 0,
    "total_input_tokens": 7,
    "total_output_tokens": 20,
    "total_thought_tokens": 22,
    "total_tokens": 49,
    "total_tool_use_tokens": 0
  }
}
```

### Multi-turn

<iframe src="https:///frame/api/interactions-api_9133ce14b4ac1f91f63da778a353ddb1e986278bf4be54fa1f41171d68971e6d.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

#### Example Response

```json
{
  "created": "2025-11-26T12:22:47Z",
  "id": "v1_ChdPU0F4YWFtNkFwS2kxZThQZ05lbXdROBIXT1NBeGFhbTZBcEtpMWU4UGdOZW13UTg",
  "model": "gemini-3.6-flash",
  "object": "interaction",
  "status": "completed",
  "steps": [
    {
      "type": "model_output",
      "content": [
        {
          "type": "text",
          "text": "The capital of France is Paris."
        }
      ]
    }
  ],
  "updated": "2025-11-26T12:22:47Z",
  "usage": {
    "input_tokens_by_modality": [
      {
        "modality": "text",
        "tokens": 50
      }
    ],
    "total_cached_tokens": 0,
    "total_input_tokens": 50,
    "total_output_tokens": 10,
    "total_thought_tokens": 0,
    "total_tokens": 60,
    "total_tool_use_tokens": 0
  }
}
```

### Image Input

<iframe src="https:///frame/api/interactions-api_39c79f5979c068b653c90cf15324dae7182631cc5586beb5ae23b93ce4da6ee0.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

#### Example Response

```json
{
  "created": "2025-11-26T12:22:47Z",
  "id": "v1_ChdPU0F4YWFtNkFwS2kxZThQZ05lbXdROBIXT1NBeGFhbTZBcEtpMWU4UGdOZW13UTg",
  "model": "gemini-3.6-flash",
  "object": "interaction",
  "status": "completed",
  "steps": [
    {
      "type": "model_output",
      "content": [
        {
          "type": "text",
          "text": "A white humanoid robot with glowing blue eyes stands holding a red skateboard."
        }
      ]
    }
  ],
  "updated": "2025-11-26T12:22:47Z",
  "usage": {
    "input_tokens_by_modality": [
      {
        "modality": "text",
        "tokens": 10
      },
      {
        "modality": "image",
        "tokens": 258
      }
    ],
    "total_cached_tokens": 0,
    "total_input_tokens": 268,
    "total_output_tokens": 20,
    "total_thought_tokens": 0,
    "total_tokens": 288,
    "total_tool_use_tokens": 0
  }
}
```

### Function Calling

<iframe src="https:///frame/api/interactions-api_866d12495631974ca58e3fcda3e1d5acd92ce06afb97473d8bb721bc1e95489d.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

#### Example Response

```json
{
  "created": "2025-11-26T12:22:47Z",
  "id": "v1_ChdPU0F4YWFtNkFwS2kxZThQZ05lbXdROBIXT1NBeGFhbTZBcEtpMWU4UGdOZW13UTg",
  "model": "gemini-3.6-flash",
  "object": "interaction",
  "status": "requires_action",
  "steps": [
    {
      "name": "get_weather",
      "type": "function_call",
      "arguments": {
        "location": "Boston, MA"
      },
      "id": "gth23981"
    }
  ],
  "updated": "2025-11-26T12:22:47Z",
  "usage": {
    "input_tokens_by_modality": [
      {
        "modality": "text",
        "tokens": 100
      }
    ],
    "total_cached_tokens": 0,
    "total_input_tokens": 100,
    "total_output_tokens": 25,
    "total_thought_tokens": 0,
    "total_tokens": 125,
    "total_tool_use_tokens": 50
  }
}
```

### Deep Research

<iframe src="https:///frame/api/interactions-api_0741abf448485cc98000a2dce47edc14d9271ffe0cfd205f5afbeb25e0521529.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

#### Example Response

```json
{
  "agent": "deep-research-pro-preview-12-2025",
  "created": "2025-11-26T12:22:47Z",
  "id": "v1_ChdPU0F4YWFtNkFwS2kxZThQZ05lbXdROBIXT1NBeGFhbTZBcEtpMWU4UGdOZW13UTg",
  "object": "interaction",
  "status": "completed",
  "steps": [
    {
      "type": "model_output",
      "content": [
        {
          "type": "text",
          "text": "Here is a comprehensive research report on the current state of cancer research..."
        }
      ]
    }
  ],
  "updated": "2025-11-26T12:22:47Z",
  "usage": {
    "input_tokens_by_modality": [
      {
        "modality": "text",
        "tokens": 20
      }
    ],
    "total_cached_tokens": 0,
    "total_input_tokens": 20,
    "total_output_tokens": 1000,
    "total_thought_tokens": 500,
    "total_tokens": 1520,
    "total_tool_use_tokens": 0
  }
}
```

### Antigravity Agent

<iframe src="https:///frame/api/interactions-api_b50b113823dff553e253cd26525c555cef4b18b20d261e331a7933bb95ab583b.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

#### Example Response

```json
{
  "agent": "antigravity-preview-05-2026",
  "created": "2025-11-26T12:22:47Z",
  "environment_id": "env_abc123",
  "id": "v1_ChdPU0F4YWFtNkFwS2kxZThQZ05lbXdROBIXT1NBeGFhbTZBcEtpMWU4UGdOZW13UTg",
  "object": "interaction",
  "status": "completed",
  "steps": [
    {
      "type": "model_output",
      "content": [
        {
          "type": "text",
          "text": "I've summarized the top 5 Hacker News stories and saved the results to /workspace/summary.md."
        }
      ]
    }
  ],
  "updated": "2025-11-26T12:22:47Z",
  "usage": {
    "input_tokens_by_modality": [
      {
        "modality": "text",
        "tokens": 50
      }
    ],
    "total_cached_tokens": 0,
    "total_input_tokens": 50,
    "total_output_tokens": 500,
    "total_thought_tokens": 200,
    "total_tokens": 750,
    "total_tool_use_tokens": 0
  }
}
```

### Reuse Environment

<iframe src="https:///frame/api/interactions-api_53d01480bc081580a4cafb84fe212a25f41784b8b9b8a172e69d633190b18e98.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

#### Example Response

```json
{
  "agent": "antigravity-preview-05-2026",
  "created": "2025-11-26T12:23:00Z",
  "environment_id": "env_abc123",
  "id": "v1_Chd2ZTJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkwMTIzNDU2Nzg",
  "object": "interaction",
  "status": "completed",
  "steps": [
    {
      "type": "model_output",
      "content": [
        {
          "type": "text",
          "text": "I've updated /workspace/hello.py to accept a name argument and greet the user."
        }
      ]
    }
  ],
  "updated": "2025-11-26T12:23:00Z",
  "usage": {
    "input_tokens_by_modality": [
      {
        "modality": "text",
        "tokens": 80
      }
    ],
    "total_cached_tokens": 0,
    "total_input_tokens": 80,
    "total_output_tokens": 200,
    "total_thought_tokens": 100,
    "total_tokens": 380,
    "total_tool_use_tokens": 0
  }
}
```

### With Sources

<iframe src="https:///frame/api/interactions-api_1a877d1213f5ef572f52563eec4697b9e9c15252990eac993413f92d4eb24846.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

### Custom Agent

<iframe src="https:///frame/api/interactions-api_1b202c540d186558083c0048321587710b0d800b339db184e9af71c433c52d22.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

## Canceling an interaction

post https://generativelanguage.googleapis.com/v1beta/interactions/{id}/cancel Cancels an interaction by id. This only applies to background interactions that are still running.
- [Path / Query parameters](https://ai.google.dev/api/interactions-api#cancelInteractionById.PATH_PARAMETERS)
- [Response](https://ai.google.dev/api/interactions-api#cancelInteractionById.response)

### Path / Query Parameters

api_version string (required) Which version of the API to use.
id string (required) The unique identifier of the interaction to cancel.

### Response

Returns an [Interaction](https://ai.google.dev/api/interactions-api#Resource:Interaction) resource.

### Cancel Interaction

<iframe src="https:///frame/api/interactions-api_e642441dbebb28afc8754cdbf82c90c4cf0c626747488d54a3acb9303334d36d.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

#### Example Response

```json
{
  "agent": "deep-research-pro-preview-12-2025",
  "created": "2026-06-22T04:55:47Z",
  "id": "v1_ChdVc0E0YXJTYk1zYlV6N0lQcXRXVG1BYxIXVXNBNGFyU2JNc2JVejdJUHF0V1RtQWM",
  "status": "cancelled",
  "steps": [
    {
      "type": "user_input",
      "content": [
        {
          "type": "text",
          "text": "Research the history of the Google TPUs with a focus on 2025 specs."
        }
      ]
    }
  ],
  "updated": "2026-06-22T04:55:47Z"
}
```

## Retrieving an interaction

get https://generativelanguage.googleapis.com/v1beta/interactions/{id} Retrieves the full details of a single interaction based on its \`Interaction.id\`.
- [Path / Query parameters](https://ai.google.dev/api/interactions-api#getInteractionById.PATH_PARAMETERS)
- [Response](https://ai.google.dev/api/interactions-api#getInteractionById.response)

### Path / Query Parameters

api_version string (required) Which version of the API to use.
id string (required) The unique identifier of the interaction to retrieve.
last_event_id string (optional) Optional. If set, resumes the interaction stream from the next chunk after the event marked by the event id. Can only be used if \`stream\` is true.
stream boolean (optional) If set to true, the generated content will be streamed incrementally.

*Defaults to: `False`*

### Response

Returns an [Interaction](https://ai.google.dev/api/interactions-api#Resource:Interaction) resource.

### Get Interaction

<iframe src="https:///frame/api/interactions-api_8beb745c8a2a4001378da8ee2ed2e0771b8435c782967d02966b7968038a6b51.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

#### Example Response

```json
{
  "created": "2025-11-26T12:25:15Z",
  "id": "v1_ChdPU0F4YWFtNkFwS2kxZThQZ05lbXdROBIXT1NBeGFhbTZBcEtpMWU4UGdOZW13UTg",
  "model": "gemini-3.6-flash",
  "object": "interaction",
  "status": "completed",
  "steps": [
    {
      "type": "model_output",
      "content": [
        {
          "type": "text",
          "text": "I'm doing great, thank you for asking! How can I help you today?"
        }
      ]
    }
  ],
  "updated": "2025-11-26T12:25:15Z"
}
```

## Deleting an interaction

delete https://generativelanguage.googleapis.com/v1beta/interactions/{id} Deletes the interaction by id.
- [Path / Query parameters](https://ai.google.dev/api/interactions-api#deleteInteraction.PATH_PARAMETERS)
- [Response](https://ai.google.dev/api/interactions-api#deleteInteraction.response)

### Path / Query Parameters

api_version string (required) Which version of the API to use.
id string (required) The unique identifier of the interaction to delete.

### Response

If successful, the response is empty.

### Delete

<iframe src="https:///frame/api/interactions-api_513c9609e66e12d61d05211d53102de3457a011bd487dc4589b25c9e06448bcd.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

## Resources

### Interaction

The Interaction resource.

#### Fields

agent AgentOption (optional) The name of the \`Agent\` used for generating the interaction.
The agent to interact with.

#### Possible values

- `deep-research-pro-preview-12-2025`

  Gemini Deep Research Agent
- `deep-research-preview-04-2026`

  Gemini Deep Research Agent
- `deep-research-max-preview-04-2026`

  Gemini Deep Research Max Agent
- `antigravity-preview-05-2026`

  Use the Antigravity managed agent to perform multi-step tasks that require reasoning, file operations, and tool use.
agent_config object (optional) Configuration parameters for the agent interaction.

#### Possible Types

Polymorphic discriminator: `type`
AntigravityAgentConfig Configuration for the Antigravity agent runtime.
Provides server-side control over the agent's execution environment
and tool configuration.
max_total_tokens string (optional) Max total tokens for the agent run.
model string (optional) The model to use for agent reasoning.
type object (required) No description provided.

Always set to `"antigravity"`.
CodeMenderAgentConfig Configuration for the CodeMender agent.
find_request FindRequest (optional) Parameters for finding vulnerabilities.
Request parameters specific to FIND sessions, used for discovering
vulnerabilities in a codebase.

#### Fields

description string (optional) Additional context or custom instructions provided by the user to guide
the vulnerability analysis.
finding_id string (optional) The identifier of a specific finding to verify. This is primarily used in
VERIFY mode to focus the agent's execution-based validation on a single
vulnerability.
mode enum (string) (optional) The mode of the find session.

Possible
values:

- `scan`

  Fast scan using only the initial classifier.
- `verify`

  Performs classification followed by detailed investigation.
source_files array (FileContent) (optional) A list of source files to provide as context for the scan.
Content of a single file in the codebase.

#### Fields

content string (optional) The UTF-8 encoded text content of the file.
path string (optional) The relative path of the file from the project root.
fix_request FixRequest (optional) Parameters for fixing vulnerabilities.
Request parameters specific to FIX sessions, used for generating and
validating security patches.

#### Fields

description string (optional) Additional context or custom instructions provided by the user to guide
the patch generation process.
finding_id string (optional) The identifier of the specific security finding to be remediated. This ID
maps to a previously discovered vulnerability.
source_files array (FileContent) (optional) A list of source files providing context for the remediation. These files
are typically the ones containing the identified vulnerability.
Content of a single file in the codebase.

#### Fields

content string (optional) The UTF-8 encoded text content of the file.
path string (optional) The relative path of the file from the project root.
model string (optional) The name of the model to use for the CodeMender agent. One
CodeMender session will only use one model.
session_config SessionConfig (optional) Optional session-specific configurations to override default agent
behavior.
The configuration of CodeMender sessions.

#### Fields

max_rounds integer (optional) The maximum number of interaction rounds the agent is allowed to perform
before reaching a timeout.
session_id string (optional) Parameter for grouping multiple interactions that belong to
the same CodeMender session.
type object (required) No description provided.

Always set to `"code-mender"`.
DeepResearchAgentConfig Configuration for the Deep Research agent.
collaborative_planning boolean (optional) Enables human-in-the-loop planning for the Deep Research agent. If set to
true, the Deep Research agent will provide a research plan in its response.
The agent will then proceed only if the user confirms the plan in the next
turn.
enable_bigquery_tool boolean (optional) Enables bigquery tool for the Deep Research agent.
thinking_summaries ThinkingSummaries (optional) Whether to include thought summaries in the response.
<br />

#### Possible values

- `auto`

  Auto thinking summaries.
- `none`

  No thinking summaries.
type object (required) No description provided.

Always set to `"deep-research"`.
visualization enum (string) (optional) Whether to include visualizations in the response.

Possible
values:

- `off`

  Do not include visualizations.
- `auto`

  Automatically include visualizations.
DynamicAgentConfig Configuration for dynamic agents.
type object (required) No description provided.

Always set to `"dynamic"`.
created string (optional) Output only. The time at which the response was created in ISO 8601 format
(YYYY-MM-DDThh:mm:ssZ).
environment [EnvironmentConfig](https://ai.google.dev/api/interactions-api#Resource:EnvironmentConfig) or string (optional) The environment configuration for the interaction. Can be an object specifying remote environment sources or a string referencing an existing environment ID.
environment_id string (optional) Output only. The environment ID for the interaction. Only populated if environment
config is set in the request.
id string (optional) Required. Output only. A unique identifier for the interaction completion.

*Defaults to:*
input [Content](https://ai.google.dev/api/interactions-api#Resource:Content) or array ([Content](https://ai.google.dev/api/interactions-api#Resource:Content)) or array ([Step](https://ai.google.dev/api/interactions-api#Resource:Step)) or array (Turn) or string (optional) The input for the interaction.
labels object (optional) The labels with user-defined metadata for the request.
model ModelOption (optional) The name of the \`Model\` used for generating the interaction.
The model that will complete your prompt.\\n\\nSee \[models\](https://ai.google.dev/gemini-api/docs/models) for additional details.

#### Possible values

- `gemini-2.5-flash`

  Our first hybrid reasoning model which supports a 1M token context window and has thinking budgets.
- `gemini-2.5-pro`

  Our state-of-the-art multipurpose model, which excels at coding and complex reasoning tasks.
- `gemma-4-26b-a4b-it`

  Gemma 4 26B A4B IT
- `gemma-4-31b-it`

  Gemma 4 31B IT
- `gemini-flash-latest`

  Latest release of Gemini Flash
- `gemini-flash-lite-latest`

  Latest release of Gemini Flash-Lite
- `gemini-pro-latest`

  Latest release of Gemini Pro
- `gemini-2.5-flash-lite`

  Our smallest and most cost effective model, built for at scale usage.
- `gemini-2.5-flash-image`

  Our native image generation model, optimized for speed, flexibility, and contextual understanding. Text input and output is priced the same as 2.5 Flash.
- `gemini-3-flash-preview`

  Our most intelligent model built for speed, combining frontier intelligence with superior search and grounding.
- `gemini-3.1-pro-preview`

  Our latest SOTA reasoning model with unprecedented depth and nuance, and powerful multimodal understanding and coding capabilities.
- `gemini-3.1-pro-preview-customtools`

  Gemini 3.1 Pro Preview optimized for custom tool usage
- `gemini-3.1-flash-lite`

  Our most cost-efficient model, optimized for high-volume agentic tasks, translation, and simple data processing.
- `gemini-3-pro-image`

  Gemini 3 Pro Image
- `nano-banana-pro-preview`

  Gemini 3 Pro Image Preview
- `gemini-3.1-flash-image`

  Gemini 3.1 Flash Image.
- `gemini-3.5-flash`

  Our most intelligent model for sustained frontier performance in agentic and coding tasks.
- `gemini-3.6-flash`

  Our most intelligent model for sustained frontier performance in agentic and coding tasks.
- `lyria-3-clip-preview`

  Our low-latency, music generation model optimized for high-fidelity audio clips and precise rhythmic control.
- `lyria-3-pro-preview`

  Our advanced, full-song generative model with deep compositional understanding, optimized for precise structural control and complex transitions across diverse musical styles.
- `gemini-robotics-er-1.6-preview`

  Gemini Robotics-ER 1.6 Preview
output_audio AudioContent (optional) The last audio generated by the model in response to the current request.

Note: this is added by the SDK.
An audio content block.

#### Fields

channels integer (optional) The number of audio channels.
data string (optional) The audio content.
mime_type enum (string) (optional) The mime type of the audio.

Possible
values:

- `audio/wav`

  WAV audio format
- `audio/mp3`

  MP3 audio format
- `audio/aiff`

  AIFF audio format
- `audio/aac`

  AAC audio format
- `audio/ogg`

  OGG audio format
- `audio/flac`

  FLAC audio format
- `audio/mpeg`

  MPEG audio format
- `audio/m4a`

  M4A audio format
- `audio/l16`

  L16 audio format
- `audio/opus`

  OPUS audio format
- `audio/alaw`

  ALAW audio format
- `audio/mulaw`

  MULAW audio format
sample_rate integer (optional) The sample rate of the audio.
type object (optional) No description provided.

Always set to `"audio"`.
uri string (optional) The URI of the audio.
output_image [ImageContent](https://ai.google.dev/api/interactions-api#Resource:ImageContent) (optional) The last image generated by the model in response to the current request.

Note: this is added by the SDK.
output_text string (optional) Concatenated text from the last model output in response to the current request.

Note: this is added by the SDK.
output_video VideoContent (optional) The last video generated by the model in response to the current request.

Note: this is added by the SDK.
A video content block.

#### Fields

data string (optional) The video content.
mime_type enum (string) (optional) The mime type of the video.

Possible
values:

- `video/mp4`

  MP4 video format
- `video/mpeg`

  MPEG video format
- `video/mpg`

  MPG video format
- `video/mov`

  MOV video format
- `video/avi`

  AVI video format
- `video/x-flv`

  FLV video format
- `video/webm`

  WebM video format
- `video/wmv`

  WMV video format
- `video/3gpp`

  3GPP video format
resolution MediaResolution (optional) The resolution of the media.
<br />

#### Possible values

- `low`

  Low resolution.
- `medium`

  Medium resolution.
- `high`

  High resolution.
- `ultra_high`

  Ultra high resolution.
type object (optional) No description provided.

Always set to `"video"`.
uri string (optional) The URI of the video.
previous_interaction_id string (optional) The ID of the previous interaction, if any.
response_format [ResponseFormat](https://ai.google.dev/api/interactions-api#Resource:ResponseFormat) or array ([ResponseFormat](https://ai.google.dev/api/interactions-api#Resource:ResponseFormat)) (optional) Enforces that the generated response is a JSON object that complies with the JSON schema specified in this field.
response_modalities array (ResponseModality) (optional) The requested modalities of the response (TEXT, IMAGE, AUDIO).
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
safety_settings array (SafetySetting) (optional) Safety settings for the interaction.
A safety setting that affects the safety-blocking behavior.

A SafetySetting consists of a
harm category and a
threshold for that
category.

#### Fields

method enum (string) (optional) Optional. The method for blocking content. If not specified, the default
behavior is to use the probability score.

Possible
values:

- `severity`

  The harm block method uses both probability and severity scores.
- `probability`

  The harm block method uses the probability score.
threshold enum (string) (optional) Required. The threshold for blocking content. If the harm probability
exceeds this threshold, the content will be blocked.

Possible
values:

- `block_low_and_above`

  Block content with a low harm probability or higher.
- `block_medium_and_above`

  Block content with a medium harm probability or higher.
- `block_only_high`

  Block content with a high harm probability.
- `block_none`

  Do not block any content, regardless of its harm probability.
- `off`

  Turn off the safety filter entirely.
type HarmCategory (optional) Required. The type of harm category to be blocked.
<br />

#### Possible values

- `hate_speech`

  Content that promotes violence or incites hatred against individuals or
  groups based on certain attributes.
- `dangerous_content`

  Content that promotes, facilitates, or enables dangerous activities.
- `harassment`

  Abusive, threatening, or content intended to bully, torment, or ridicule.
- `sexually_explicit`

  Content that contains sexually explicit material.
- `civic_integrity`

  Deprecated: Election filter is not longer supported.
  The harm category is civic integrity.
- `image_hate`

  Images that contain hate speech.
- `image_dangerous_content`

  Images that contain dangerous content.
- `image_harassment`

  Images that contain harassment.
- `image_sexually_explicit`

  Images that contain sexually explicit content.
- `jailbreak`

  Prompts designed to bypass safety filters.
service_tier ServiceTier (optional) The service tier for the interaction.
<br />

#### Possible values

- `flex`

  Flex service tier.
- `standard`

  Standard service tier.
- `priority`

  Priority service tier.
status enum (string) (optional) Required. Output only. The status of the interaction.

Possible
values:

- `in_progress`

  The interaction is in progress.
- `requires_action`

  The interaction requires action/input from the user.
- `completed`

  The interaction is completed.
- `failed`

  The interaction failed.
- `cancelled`

  The interaction was cancelled.
- `incomplete`

  The interaction is completed, but contains incomplete results (e.g.
  hitting max_tokens).
- `budget_exceeded`

  The interaction was halted because the token budget was exceeded.
- `queued`

  The interaction is queued, waiting for processing.
steps array ([Step](https://ai.google.dev/api/interactions-api#Resource:Step)) (optional) Output only. The steps that make up the interaction, when included in the response.
system_instruction string (optional) System instruction for the interaction.
tools array ([Tool](https://ai.google.dev/api/interactions-api#Resource:Tool)) (optional) A list of tool declarations the model may call during interaction.
updated string (optional) Output only. The time at which the response was last updated in ISO 8601 format
(YYYY-MM-DDThh:mm:ssZ).
usage Usage (optional) Output only. Statistics on the interaction request's token usage.
Statistics on the interaction request's token usage.

#### Fields

cached_tokens_by_modality array (ModalityTokens) (optional) A breakdown of cached token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
grounding_tool_count array (GroundingToolCount) (optional) Grounding tool count.
The number of grounding tool counts.

#### Fields

count integer (optional) The number of grounding tool counts.
type enum (string) (optional) The grounding tool type associated with the count.

Possible
values:

- `google_search`

  Grounding with Google Web Search and Image Search, \& Web Grounding
  for Enterprise.
- `google_maps`

  Grounding with Google Maps.
- `retrieval`

  Grounding with customer's data, for example, VertexAISearch.
input_tokens_by_modality array (ModalityTokens) (optional) A breakdown of input token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
output_tokens_by_modality array (ModalityTokens) (optional) A breakdown of output token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
tool_use_tokens_by_modality array (ModalityTokens) (optional) A breakdown of tool-use token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
total_cached_tokens integer (optional) Number of tokens in the cached part of the prompt (the cached content).
total_input_tokens integer (optional) Number of tokens in the prompt (context).
total_output_tokens integer (optional) Total number of tokens across all the generated responses.
total_thought_tokens integer (optional) Number of tokens of thoughts for thinking models.
total_tokens integer (optional) Total token count for the interaction request (prompt + responses + other
internal tokens).
total_tool_use_tokens integer (optional) Number of tokens present in tool-use prompt(s).
webhook_config WebhookConfig (optional) Optional. Webhook configuration for receiving notifications when the
interaction completes.
Message for configuring webhook events for a request.

#### Fields

uris array (string) (optional) Optional. If set, these webhook URIs will be used for webhook events instead of the
registered webhooks.
user_metadata object (optional) Optional. The user metadata that will be returned on each event emission to the
webhooks.

### Examples

### Example

```bash
{
  "created": "2025-12-04T15:01:45Z",
  "id": "v1_ChdXS0l4YWZXTk9xbk0xZThQczhEcmlROBIXV0tJeGFmV05PcW5NMWU4UHM4RHJpUTg",
  "model": "gemini-3.6-flash",
  "object": "interaction",
  "status": "completed",
  "steps": [
    {
      "type": "model_output",
      "content": [
        {
          "type": "text",
          "text": "Hello! I'm doing well, functioning as expected. Thank you for asking! How are you doing today?"
        }
      ]
    }
  ],
  "updated": "2025-12-04T15:01:45Z",
  "usage": {
    "input_tokens_by_modality": [
      {
        "modality": "text",
        "tokens": 7
      }
    ],
    "total_cached_tokens": 0,
    "total_input_tokens": 7,
    "total_output_tokens": 23,
    "total_thought_tokens": 49,
    "total_tokens": 79,
    "total_tool_use_tokens": 0
  }
}
```

## Data Models

### Content

The content of the response.

### Possible Types

AudioContent An audio content block.
channels integer (optional) The number of audio channels.
data string (optional) The audio content.
mime_type enum (string) (optional) The mime type of the audio.

Possible
values:

- `audio/wav`

  WAV audio format
- `audio/mp3`

  MP3 audio format
- `audio/aiff`

  AIFF audio format
- `audio/aac`

  AAC audio format
- `audio/ogg`

  OGG audio format
- `audio/flac`

  FLAC audio format
- `audio/mpeg`

  MPEG audio format
- `audio/m4a`

  M4A audio format
- `audio/l16`

  L16 audio format
- `audio/opus`

  OPUS audio format
- `audio/alaw`

  ALAW audio format
- `audio/mulaw`

  MULAW audio format
sample_rate integer (optional) The sample rate of the audio.
type object (required) No description provided.

Always set to `"audio"`.
uri string (optional) The URI of the audio.
DocumentContent A document content block.
data string (optional) The document content.
mime_type enum (string) (optional) The mime type of the document.

Possible
values:

- `application/pdf`

  PDF document format
- `text/csv`

  CSV document format
type object (required) No description provided.

Always set to `"document"`.
uri string (optional) The URI of the document.
ImageContent An image content block.
data string (optional) The image content.
mime_type enum (string) (optional) The mime type of the image.

Possible
values:

- `image/png`

  PNG image format
- `image/jpeg`

  JPEG image format
- `image/webp`

  WebP image format
- `image/heic`

  HEIC image format
- `image/heif`

  HEIF image format
- `image/gif`

  GIF image format
- `image/bmp`

  BMP image format
- `image/tiff`

  TIFF image format
resolution MediaResolution (optional) The resolution of the media.
<br />

#### Possible values

- `low`

  Low resolution.
- `medium`

  Medium resolution.
- `high`

  High resolution.
- `ultra_high`

  Ultra high resolution.
type object (required) No description provided.

Always set to `"image"`.
uri string (optional) The URI of the image.
TextContent A text content block.
annotations array (Annotation) (optional) Citation information for model-generated content.
Citation information for model-generated content.

#### Possible Types

FileCitation A file citation annotation.
custom_metadata object (optional) User provided metadata about the retrieved context.
document_uri string (optional) The URI of the file.
end_index integer (optional) End of the attributed segment, exclusive.
file_name string (optional) The name of the file.
media_id string (optional) Media ID in-case of image citations, if applicable.
page_number integer (optional) Page number of the cited document, if applicable.
source string (optional) Source attributed for a portion of the text.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
type object (required) No description provided.

Always set to `"file_citation"`.
PlaceCitation A place citation annotation.
end_index integer (optional) End of the attributed segment, exclusive.
name string (optional) Title of the place.
place_id string (optional) The ID of the place, in \`places/{place_id}\` format.
review_snippets array (ReviewSnippet) (optional) Snippets of reviews that are used to generate answers about the
features of a given place in Google Maps.
Encapsulates a snippet of a user review that answers a question about
the features of a specific place in Google Maps.

#### Fields

review_id string (optional) The ID of the review snippet.
title string (optional) Title of the review.
url string (optional) A link that corresponds to the user review on Google Maps.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
type object (required) No description provided.

Always set to `"place_citation"`.
url string (optional) URI reference of the place.
UrlCitation A URL citation annotation.
end_index integer (optional) End of the attributed segment, exclusive.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
title string (optional) The title of the URL.
type object (required) No description provided.

Always set to `"url_citation"`.
url string (optional) The URL.
WordInfo Word-level ASR annotation for transcription output.
Carries the word text, optional timing, and optional speaker attribution.
end_index integer (optional) End of the attributed segment, exclusive.
end_offset string (optional) End offset in time of the word relative to the start of the audio.
Present when timestamp_granularities contains "word".
speaker string (optional) Optional. Speaker label for this word (e.g. "spk_1", "spk_2").
Present when diarization_mode is set in TranscriptionConfig.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
start_offset string (optional) Start offset in time of the word relative to the start of the audio.
Present when timestamp_granularities contains "word".
text string (optional) The transcribed word.
type object (required) No description provided.

Always set to `"word_info"`.
text string (required) Required. The text content.
type object (required) No description provided.

Always set to `"text"`.
VideoContent A video content block.
data string (optional) The video content.
mime_type enum (string) (optional) The mime type of the video.

Possible
values:

- `video/mp4`

  MP4 video format
- `video/mpeg`

  MPEG video format
- `video/mpg`

  MPG video format
- `video/mov`

  MOV video format
- `video/avi`

  AVI video format
- `video/x-flv`

  FLV video format
- `video/webm`

  WebM video format
- `video/wmv`

  WMV video format
- `video/3gpp`

  3GPP video format
resolution MediaResolution (optional) The resolution of the media.
<br />

#### Possible values

- `low`

  Low resolution.
- `medium`

  Medium resolution.
- `high`

  High resolution.
- `ultra_high`

  Ultra high resolution.
type object (required) No description provided.

Always set to `"video"`.
uri string (optional) The URI of the video.

### Examples

### Audio

```json
{
  "type": "audio",
  "data": "BASE64_ENCODED_AUDIO",
  "mime_type": "audio/wav"
}
```

### Document

```json
{
  "type": "document",
  "data": "BASE64_ENCODED_DOCUMENT",
  "mime_type": "application/pdf"
}
```

### Image

```json
{
  "type": "image",
  "data": "BASE64_ENCODED_IMAGE",
  "mime_type": "image/png"
}
```

### Text

```json
{
  "type": "text",
  "text": "Hello, how are you?"
}
```

### Video

```json
{
  "type": "video",
  "uri": "https://www.youtube.com/watch?v=9hE5-98ZeCg"
}
```

### Tool

A tool that can be used by the model.

### Possible Types

CodeExecution A tool that can be used by the model to execute code.
type object (required) No description provided.

Always set to `"code_execution"`.
ComputerUse A tool that can be used by the model to interact with the computer.
disabled_safety_policies array (enum (string)) (optional) Optional. Disabled safety policies for computer use.

Possible
values:

- `financial_transactions`

  Safety policy for financial transactions.
- `sensitive_data_modification`

  Safety policy for sensitive data modification.
- `communication_tool`

  Safety policy for communication tools (e.g. Gmail, Chat, Meet).
- `account_creation`

  Safety policy for account creation.
- `data_modification`

  Safety policy for data modification.
- `user_consent_management`

  Safety policy for user consent management.
- `legal_terms_and_agreements`

  Safety policy for legal terms and agreements.
enable_prompt_injection_detection boolean (optional) Whether enable the prompt injection detection check on computer-use
request.
environment enum (string) (optional) The environment being operated.

Possible
values:

- `browser`

  Operates in a web browser.
- `mobile`

  Operates in a mobile environment.
- `desktop`

  Operates in a desktop environment.
excluded_predefined_functions array (string) (optional) The list of predefined functions that are excluded from the model call.
type object (required) No description provided.

Always set to `"computer_use"`.
FileSearch A tool that can be used by the model to search files.
file_search_store_names array (string) (optional) The file search store names to search.
metadata_filter string (optional) Metadata filter to apply to the semantic retrieval documents and chunks.
top_k integer (optional) The number of semantic retrieval chunks to retrieve.
type object (required) No description provided.

Always set to `"file_search"`.
Function A tool that can be used by the model.
description string (optional) A description of the function.
name string (optional) The name of the function.
parameters object (optional) The JSON Schema for the function's parameters.
type object (required) No description provided.

Always set to `"function"`.
GoogleMaps A tool that can be used by the model to call Google Maps.
enable_widget boolean (optional) Whether to return a widget context token in the tool call result of the
response.
latitude number (optional) The latitude of the user's location.
longitude number (optional) The longitude of the user's location.
type object (required) No description provided.

Always set to `"google_maps"`.
GoogleSearch A tool that can be used by the model to search Google.
search_types array (enum (string)) (optional) The types of search grounding to enable.

Possible
values:

- `web_search`

  Setting this field enables web search. Only text results are returned.
- `image_search`

  Setting this field enables image search. Image bytes are returned.
- `enterprise_web_search`

  Setting this field enables enterprise web search.
type object (required) No description provided.

Always set to `"google_search"`.
McpServer A MCPServer is a server that can be called by the model to perform actions.
allowed_tools array (AllowedTools) (optional) The allowed tools.
The configuration for allowed tools.

#### Fields

mode enum (string) (optional) The mode of the tool choice.

Possible
values:

- `auto`

  Auto tool choice.
- `any`

  Any tool choice.
- `none`

  No tool choice.
- `validated`

  Validated tool choice.
tools array (string) (optional) The names of the allowed tools.
headers object (optional) Optional: Fields for authentication headers, timeouts, etc., if needed.
name string (optional) The name of the MCPServer.
type object (required) No description provided.

Always set to `"mcp_server"`.
url string (optional) The full URL for the MCPServer endpoint.
Example: "https://api.example.com/mcp"
Retrieval A tool that can be used by the model to retrieve files.
exa_ai_search_config ExaAISearchConfig (optional) Used to specify configuration for ExaAISearch.
Used to specify configuration for ExaAISearch.

#### Fields

api_key string (optional) Required. The API key for ExaAiSearch.
custom_config object (optional) Optional. This field can be used to pass any parameter from the Exa.ai Search API.
parallel_ai_search_config ParallelAISearchConfig (optional) Used to specify configuration for ParallelAISearch.
Used to specify configuration for ParallelAISearch.

#### Fields

api_key string (optional) Optional. The API key for ParallelAiSearch.
custom_config object (optional) Optional. Custom configs for ParallelAiSearch.
rag_store_config RagStoreConfig (optional) Used to specify configuration for RagStore.
Use to specify configuration for RAG Store.

#### Fields

rag_resources array (RagResource) (optional) Optional. The representation of the rag source.
The definition of the Rag resource.

#### Fields

rag_corpus string (optional) Optional. RagCorpora resource name.
rag_file_ids array (string) (optional) Optional. rag_file_id. The files should be in the same rag_corpus set in
rag_corpus field.
rag_retrieval_config RagRetrievalConfig (optional) Optional. The retrieval config for the Rag query.
Specifies the context retrieval config.

#### Fields

filter Filter (optional) Optional. Config for filters.
Config for filters.

#### Fields

metadata_filter string (optional) Optional. String for metadata filtering.
vector_distance_threshold number (optional) Optional. Only returns contexts with vector distance smaller than the
threshold.
vector_similarity_threshold number (optional) Optional. Only returns contexts with vector similarity larger than the
threshold.
hybrid_search HybridSearch (optional) Optional. Config for Hybrid Search.
Config for Hybrid Search.

#### Fields

alpha number (optional) Optional. Alpha value controls the weight between dense and sparse vector search
results.
ranking Ranking (optional) Optional. Config for ranking and reranking.
Config for ranking and reranking.
top_k integer (optional) Optional. The number of contexts to retrieve.
retrieval_types array (enum (string)) (optional) The types of file retrieval to enable.

Possible
values:

- `rag_store`
- `exa_ai_search`
- `parallel_ai_search`
type object (required) No description provided.

Always set to `"retrieval"`.
UrlContext A tool that can be used by the model to fetch URL context.
type object (required) No description provided.

Always set to `"url_context"`.

### Examples

### CodeExecution

<iframe src="https:///frame/api/interactions-api_ab29aeb71ea190cbf0acebeccdff632d78c2a32645316790f56b29d2ccafa166.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

### ComputerUse

<iframe src="https:///frame/api/interactions-api_6f72341ccbe466e7d0af80b46d454c28bfb6efa77050cb1ed4668db3901343cb.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

### FileSearch

<iframe src="https:///frame/api/interactions-api_1ff31b29acafa05ad33e5fbf0c9d8951c88efd7e79a86ca39120f2bc2134b609.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

### Function

<iframe src="https:///frame/api/interactions-api_4a1db7d62da69faeb72a40374f13f6b111a3932f61a46567c76ab85419f661e4.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

### GoogleMaps

<iframe src="https:///frame/api/interactions-api_c3303a09275183be23984978d037c8822abb7bfe67e67cbda20febd2f08b496b.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

### GoogleSearch

<iframe src="https:///frame/api/interactions-api_b56ef47956e1eef43bcb317b0abe89eb22bc20fd0ba2530107cbf17691d79c94.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

### McpServer

<iframe src="https:///frame/api/interactions-api_4e5e475adb821c74bdbd49d62cdaad9ea5d5d477792589019e96d91f630d2434.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

### Retrieval

No examples available for this type.

### UrlContext

<iframe src="https:///frame/api/interactions-api_f0f5afd1de6de158f3d4ecce7b66a0c3ede446b934508e8359fd9c9354f28970.frame" class="framebox inherit-locale " allow="clipboard-write https://" allowfullscreen is-upgraded></iframe>

### InteractionSseEvent

<br />

### Possible Types

Polymorphic discriminator: `event_type`
ErrorEvent <br />

error Error (optional) No description provided.
Error message from an interaction.

#### Fields

code string (optional) A URI that identifies the error type.
message string (optional) A human-readable error message.
event_id string (optional) The event_id token to be used to resume the interaction stream, from
this event.
event_type object (required) No description provided.

Always set to `"error"`.
metadata StreamMetadata (optional) Optional metadata accompanying ANY streamed event.
<br />

#### Fields

total_usage Usage (optional) No description provided.
Statistics on the interaction request's token usage.

#### Fields

cached_tokens_by_modality array (ModalityTokens) (optional) A breakdown of cached token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
grounding_tool_count array (GroundingToolCount) (optional) Grounding tool count.
The number of grounding tool counts.

#### Fields

count integer (optional) The number of grounding tool counts.
type enum (string) (optional) The grounding tool type associated with the count.

Possible
values:

- `google_search`

  Grounding with Google Web Search and Image Search, \& Web Grounding
  for Enterprise.
- `google_maps`

  Grounding with Google Maps.
- `retrieval`

  Grounding with customer's data, for example, VertexAISearch.
input_tokens_by_modality array (ModalityTokens) (optional) A breakdown of input token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
output_tokens_by_modality array (ModalityTokens) (optional) A breakdown of output token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
tool_use_tokens_by_modality array (ModalityTokens) (optional) A breakdown of tool-use token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
total_cached_tokens integer (optional) Number of tokens in the cached part of the prompt (the cached content).
total_input_tokens integer (optional) Number of tokens in the prompt (context).
total_output_tokens integer (optional) Total number of tokens across all the generated responses.
total_thought_tokens integer (optional) Number of tokens of thoughts for thinking models.
total_tokens integer (optional) Total token count for the interaction request (prompt + responses + other
internal tokens).
total_tool_use_tokens integer (optional) Number of tokens present in tool-use prompt(s).
InteractionCompletedEvent <br />

event_id string (optional) The event_id token to be used to resume the interaction stream, from
this event.
event_type object (required) No description provided.

Always set to `"interaction.completed"`.
interaction InteractionSseEventInteraction (required) Partial completed interaction resource emitted at the end of the stream.
Partial interaction resource emitted by interaction lifecycle SSE events.
Streaming lifecycle payloads may omit fields that are only available on
full non-streaming Interaction responses.

#### Fields

agent string (optional) The agent to interact with.
created string (optional) Output only. The time at which the response was created in ISO 8601 format.
id string (optional) Required. Output only. A unique identifier for the interaction completion.
model string (optional) The model that will complete your prompt.
object string (optional) Output only. The resource type.
service_tier ServiceTier (optional) The service tier for the interaction.
<br />

#### Possible values

- `flex`

  Flex service tier.
- `standard`

  Standard service tier.
- `priority`

  Priority service tier.
status enum (string) (optional) Required. Output only. The status of the interaction.

Possible
values:

- `in_progress`

  The interaction is in progress.
- `requires_action`

  The interaction requires action/input from the user.
- `completed`

  The interaction is completed.
- `failed`

  The interaction failed.
- `cancelled`

  The interaction was cancelled.
- `incomplete`

  The interaction is completed, but contains incomplete results (e.g. hitting max_tokens).
steps array ([Step](https://ai.google.dev/api/interactions-api#Resource:Step)) (optional) Output only. The steps that make up the interaction, if included in this event.
updated string (optional) Output only. The time at which the response was last updated in ISO 8601 format.
usage Usage (optional) Output only. Statistics on the interaction request's token usage.
Statistics on the interaction request's token usage.

#### Fields

cached_tokens_by_modality array (ModalityTokens) (optional) A breakdown of cached token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
grounding_tool_count array (GroundingToolCount) (optional) Grounding tool count.
The number of grounding tool counts.

#### Fields

count integer (optional) The number of grounding tool counts.
type enum (string) (optional) The grounding tool type associated with the count.

Possible
values:

- `google_search`

  Grounding with Google Web Search and Image Search, \& Web Grounding
  for Enterprise.
- `google_maps`

  Grounding with Google Maps.
- `retrieval`

  Grounding with customer's data, for example, VertexAISearch.
input_tokens_by_modality array (ModalityTokens) (optional) A breakdown of input token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
output_tokens_by_modality array (ModalityTokens) (optional) A breakdown of output token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
tool_use_tokens_by_modality array (ModalityTokens) (optional) A breakdown of tool-use token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
total_cached_tokens integer (optional) Number of tokens in the cached part of the prompt (the cached content).
total_input_tokens integer (optional) Number of tokens in the prompt (context).
total_output_tokens integer (optional) Total number of tokens across all the generated responses.
total_thought_tokens integer (optional) Number of tokens of thoughts for thinking models.
total_tokens integer (optional) Total token count for the interaction request (prompt + responses + other
internal tokens).
total_tool_use_tokens integer (optional) Number of tokens present in tool-use prompt(s).
metadata StreamMetadata (optional) Optional metadata accompanying ANY streamed event.
<br />

#### Fields

total_usage Usage (optional) No description provided.
Statistics on the interaction request's token usage.

#### Fields

cached_tokens_by_modality array (ModalityTokens) (optional) A breakdown of cached token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
grounding_tool_count array (GroundingToolCount) (optional) Grounding tool count.
The number of grounding tool counts.

#### Fields

count integer (optional) The number of grounding tool counts.
type enum (string) (optional) The grounding tool type associated with the count.

Possible
values:

- `google_search`

  Grounding with Google Web Search and Image Search, \& Web Grounding
  for Enterprise.
- `google_maps`

  Grounding with Google Maps.
- `retrieval`

  Grounding with customer's data, for example, VertexAISearch.
input_tokens_by_modality array (ModalityTokens) (optional) A breakdown of input token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
output_tokens_by_modality array (ModalityTokens) (optional) A breakdown of output token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
tool_use_tokens_by_modality array (ModalityTokens) (optional) A breakdown of tool-use token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
total_cached_tokens integer (optional) Number of tokens in the cached part of the prompt (the cached content).
total_input_tokens integer (optional) Number of tokens in the prompt (context).
total_output_tokens integer (optional) Total number of tokens across all the generated responses.
total_thought_tokens integer (optional) Number of tokens of thoughts for thinking models.
total_tokens integer (optional) Total token count for the interaction request (prompt + responses + other
internal tokens).
total_tool_use_tokens integer (optional) Number of tokens present in tool-use prompt(s).
InteractionCreatedEvent <br />

event_id string (optional) The event_id token to be used to resume the interaction stream, from
this event.
event_type object (required) No description provided.

Always set to `"interaction.created"`.
interaction InteractionSseEventInteraction (required) Partial interaction resource emitted when the stream is created.
Partial interaction resource emitted by interaction lifecycle SSE events.
Streaming lifecycle payloads may omit fields that are only available on
full non-streaming Interaction responses.

#### Fields

agent string (optional) The agent to interact with.
created string (optional) Output only. The time at which the response was created in ISO 8601 format.
id string (optional) Required. Output only. A unique identifier for the interaction completion.
model string (optional) The model that will complete your prompt.
object string (optional) Output only. The resource type.
service_tier ServiceTier (optional) The service tier for the interaction.
<br />

#### Possible values

- `flex`

  Flex service tier.
- `standard`

  Standard service tier.
- `priority`

  Priority service tier.
status enum (string) (optional) Required. Output only. The status of the interaction.

Possible
values:

- `in_progress`

  The interaction is in progress.
- `requires_action`

  The interaction requires action/input from the user.
- `completed`

  The interaction is completed.
- `failed`

  The interaction failed.
- `cancelled`

  The interaction was cancelled.
- `incomplete`

  The interaction is completed, but contains incomplete results (e.g. hitting max_tokens).
steps array ([Step](https://ai.google.dev/api/interactions-api#Resource:Step)) (optional) Output only. The steps that make up the interaction, if included in this event.
updated string (optional) Output only. The time at which the response was last updated in ISO 8601 format.
usage Usage (optional) Output only. Statistics on the interaction request's token usage.
Statistics on the interaction request's token usage.

#### Fields

cached_tokens_by_modality array (ModalityTokens) (optional) A breakdown of cached token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
grounding_tool_count array (GroundingToolCount) (optional) Grounding tool count.
The number of grounding tool counts.

#### Fields

count integer (optional) The number of grounding tool counts.
type enum (string) (optional) The grounding tool type associated with the count.

Possible
values:

- `google_search`

  Grounding with Google Web Search and Image Search, \& Web Grounding
  for Enterprise.
- `google_maps`

  Grounding with Google Maps.
- `retrieval`

  Grounding with customer's data, for example, VertexAISearch.
input_tokens_by_modality array (ModalityTokens) (optional) A breakdown of input token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
output_tokens_by_modality array (ModalityTokens) (optional) A breakdown of output token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
tool_use_tokens_by_modality array (ModalityTokens) (optional) A breakdown of tool-use token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
total_cached_tokens integer (optional) Number of tokens in the cached part of the prompt (the cached content).
total_input_tokens integer (optional) Number of tokens in the prompt (context).
total_output_tokens integer (optional) Total number of tokens across all the generated responses.
total_thought_tokens integer (optional) Number of tokens of thoughts for thinking models.
total_tokens integer (optional) Total token count for the interaction request (prompt + responses + other
internal tokens).
total_tool_use_tokens integer (optional) Number of tokens present in tool-use prompt(s).
metadata StreamMetadata (optional) Optional metadata accompanying ANY streamed event.
<br />

#### Fields

total_usage Usage (optional) No description provided.
Statistics on the interaction request's token usage.

#### Fields

cached_tokens_by_modality array (ModalityTokens) (optional) A breakdown of cached token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
grounding_tool_count array (GroundingToolCount) (optional) Grounding tool count.
The number of grounding tool counts.

#### Fields

count integer (optional) The number of grounding tool counts.
type enum (string) (optional) The grounding tool type associated with the count.

Possible
values:

- `google_search`

  Grounding with Google Web Search and Image Search, \& Web Grounding
  for Enterprise.
- `google_maps`

  Grounding with Google Maps.
- `retrieval`

  Grounding with customer's data, for example, VertexAISearch.
input_tokens_by_modality array (ModalityTokens) (optional) A breakdown of input token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
output_tokens_by_modality array (ModalityTokens) (optional) A breakdown of output token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
tool_use_tokens_by_modality array (ModalityTokens) (optional) A breakdown of tool-use token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
total_cached_tokens integer (optional) Number of tokens in the cached part of the prompt (the cached content).
total_input_tokens integer (optional) Number of tokens in the prompt (context).
total_output_tokens integer (optional) Total number of tokens across all the generated responses.
total_thought_tokens integer (optional) Number of tokens of thoughts for thinking models.
total_tokens integer (optional) Total token count for the interaction request (prompt + responses + other
internal tokens).
total_tool_use_tokens integer (optional) Number of tokens present in tool-use prompt(s).
InteractionStatusUpdate <br />

event_id string (optional) The event_id token to be used to resume the interaction stream, from
this event.
event_type object (required) No description provided.

Always set to `"interaction.status_update"`.
interaction_id string (required) No description provided.
metadata StreamMetadata (optional) Optional metadata accompanying ANY streamed event.
<br />

#### Fields

total_usage Usage (optional) No description provided.
Statistics on the interaction request's token usage.

#### Fields

cached_tokens_by_modality array (ModalityTokens) (optional) A breakdown of cached token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
grounding_tool_count array (GroundingToolCount) (optional) Grounding tool count.
The number of grounding tool counts.

#### Fields

count integer (optional) The number of grounding tool counts.
type enum (string) (optional) The grounding tool type associated with the count.

Possible
values:

- `google_search`

  Grounding with Google Web Search and Image Search, \& Web Grounding
  for Enterprise.
- `google_maps`

  Grounding with Google Maps.
- `retrieval`

  Grounding with customer's data, for example, VertexAISearch.
input_tokens_by_modality array (ModalityTokens) (optional) A breakdown of input token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
output_tokens_by_modality array (ModalityTokens) (optional) A breakdown of output token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
tool_use_tokens_by_modality array (ModalityTokens) (optional) A breakdown of tool-use token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
total_cached_tokens integer (optional) Number of tokens in the cached part of the prompt (the cached content).
total_input_tokens integer (optional) Number of tokens in the prompt (context).
total_output_tokens integer (optional) Total number of tokens across all the generated responses.
total_thought_tokens integer (optional) Number of tokens of thoughts for thinking models.
total_tokens integer (optional) Total token count for the interaction request (prompt + responses + other
internal tokens).
total_tool_use_tokens integer (optional) Number of tokens present in tool-use prompt(s).
status enum (string) (required) No description provided.

Possible
values:

- `in_progress`

  The interaction is in progress.
- `requires_action`

  The interaction requires action/input from the user.
- `completed`

  The interaction is completed.
- `failed`

  The interaction failed.
- `cancelled`

  The interaction was cancelled.
- `incomplete`

  The interaction is completed, but contains incomplete results (e.g.
  hitting max_tokens).
- `budget_exceeded`

  The interaction was halted because the token budget was exceeded.
- `queued`

  The interaction is queued, waiting for processing (e.g. waiting for
  off-peak capacity).
StepDelta <br />

delta StepDeltaData (required) No description provided.
<br />

#### Possible Types

ArgumentsDelta <br />

arguments string (optional) No description provided.
type object (required) No description provided.

Always set to `"arguments_delta"`.
AudioDelta <br />

channels integer (optional) The number of audio channels.
data string (optional) No description provided.
mime_type enum (string) (optional) No description provided.

Possible
values:

- `audio/wav`

  WAV audio format
- `audio/mp3`

  MP3 audio format
- `audio/aiff`

  AIFF audio format
- `audio/aac`

  AAC audio format
- `audio/ogg`

  OGG audio format
- `audio/flac`

  FLAC audio format
- `audio/mpeg`

  MPEG audio format
- `audio/m4a`

  M4A audio format
- `audio/l16`

  L16 audio format
- `audio/opus`

  OPUS audio format
- `audio/alaw`

  ALAW audio format
- `audio/mulaw`

  MULAW audio format
sample_rate integer (optional) The sample rate of the audio.
type object (required) No description provided.

Always set to `"audio"`.
uri string (optional) No description provided.
CodeExecutionCallDelta <br />

arguments CodeExecutionCallArguments (required) No description provided.
The arguments to pass to the code execution.

#### Fields

code string (optional) The code to be executed.
language enum (string) (optional) Programming language of the \`code\`.

Possible
values:

- `python`

  Python \>= 3.10, with numpy and simpy available.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"code_execution_call"`.
CodeExecutionResultDelta <br />

is_error boolean (optional) No description provided.
result string (required) No description provided.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"code_execution_result"`.
DocumentDelta <br />

data string (optional) No description provided.
mime_type enum (string) (optional) No description provided.

Possible
values:

- `application/pdf`

  PDF document format
- `text/csv`

  CSV document format
type object (required) No description provided.

Always set to `"document"`.
uri string (optional) No description provided.
FileSearchCallDelta <br />

signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"file_search_call"`.
FileSearchResultDelta <br />

result array (FileSearchResult) (required) No description provided.
The result of the File Search.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"file_search_result"`.
FunctionResultDelta <br />

call_id string (required) Required. ID to match the ID from the function call block.
is_error boolean (optional) No description provided.
name string (optional) No description provided.
result array ([ImageContent](https://ai.google.dev/api/interactions-api#Resource:ImageContent) or [TextContent](https://ai.google.dev/api/interactions-api#Resource:TextContent)) or object or string (required) No description provided.
type object (required) No description provided.

Always set to `"function_result"`.
GoogleMapsCallDelta <br />

arguments GoogleMapsCallArguments (optional) The arguments to pass to the Google Maps tool.
The arguments to pass to the Google Maps tool.

#### Fields

queries array (string) (optional) The queries to be executed.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"google_maps_call"`.
GoogleMapsResultDelta <br />

result array (GoogleMapsResult) (optional) The results of the Google Maps.
The result of the Google Maps.

#### Fields

places array (Places) (optional) The places that were found.
<br />

#### Fields

name string (optional) Title of the place.
place_id string (optional) The ID of the place, in \`places/{place_id}\` format.
review_snippets array (ReviewSnippet) (optional) Snippets of reviews that are used to generate answers about the
features of a given place in Google Maps.
Encapsulates a snippet of a user review that answers a question about
the features of a specific place in Google Maps.

#### Fields

review_id string (optional) The ID of the review snippet.
title string (optional) Title of the review.
url string (optional) A link that corresponds to the user review on Google Maps.
url string (optional) URI reference of the place.
widget_context_token string (optional) Resource name of the Google Maps widget context token.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"google_maps_result"`.
GoogleSearchCallDelta <br />

arguments GoogleSearchCallArguments (required) No description provided.
The arguments to pass to Google Search.

#### Fields

queries array (string) (optional) Web search queries for the following-up web search.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"google_search_call"`.
GoogleSearchResultDelta <br />

is_error boolean (optional) No description provided.
result array (GoogleSearchResult) (required) No description provided.
The result of the Google Search.

#### Fields

search_suggestions string (optional) Web content snippet that can be embedded in a web page or an app webview.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"google_search_result"`.
ImageDelta <br />

data string (optional) No description provided.
mime_type enum (string) (optional) No description provided.

Possible
values:

- `image/png`

  PNG image format
- `image/jpeg`

  JPEG image format
- `image/webp`

  WebP image format
- `image/heic`

  HEIC image format
- `image/heif`

  HEIF image format
- `image/gif`

  GIF image format
- `image/bmp`

  BMP image format
- `image/tiff`

  TIFF image format
resolution MediaResolution (optional) The resolution of the media.
<br />

#### Possible values

- `low`

  Low resolution.
- `medium`

  Medium resolution.
- `high`

  High resolution.
- `ultra_high`

  Ultra high resolution.
type object (required) No description provided.

Always set to `"image"`.
uri string (optional) No description provided.
McpServerToolCallDelta <br />

arguments object (required) No description provided.
name string (required) No description provided.
server_name string (required) No description provided.
type object (required) No description provided.

Always set to `"mcp_server_tool_call"`.
McpServerToolResultDelta <br />

name string (optional) No description provided.
result array ([ImageContent](https://ai.google.dev/api/interactions-api#Resource:ImageContent) or [TextContent](https://ai.google.dev/api/interactions-api#Resource:TextContent)) or object or string (required) No description provided.
server_name string (optional) No description provided.
type object (required) No description provided.

Always set to `"mcp_server_tool_result"`.
RetrievalCallDelta Used by Vertex Retrieval tools such as Parallel AI, Exa AI, Vertex AI Search,
etc. RetrievalType decides which tool is used.
arguments RetrievalStepArguments (required) Required. The arguments to pass to the Retrieval tool.
The arguments to pass to Retrieval tools.

#### Fields

queries array (string) (optional) Queries for Retrieval information.
retrieval_type enum (string) (optional) The type of retrieval tools.

Possible
values:

- `rag_store`

  The type of retrieval tools.
- `exa_ai_search`

  The type of retrieval tools.
- `parallel_ai_search`

  The type of retrieval tools.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"retrieval_call"`.
RetrievalResultDelta Used by Vertex Retrieval tools such as Parallel AI, Exa AI, Vertex AI Search,
etc.
ToolResultDelta.type
is_error boolean (optional) Whether the retrieval resulted in an error.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"retrieval_result"`.
TextAnnotationDelta <br />

annotations array (Annotation) (optional) Citation information for model-generated content.
Citation information for model-generated content.

#### Possible Types

FileCitation A file citation annotation.
custom_metadata object (optional) User provided metadata about the retrieved context.
document_uri string (optional) The URI of the file.
end_index integer (optional) End of the attributed segment, exclusive.
file_name string (optional) The name of the file.
media_id string (optional) Media ID in-case of image citations, if applicable.
page_number integer (optional) Page number of the cited document, if applicable.
source string (optional) Source attributed for a portion of the text.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
type object (required) No description provided.

Always set to `"file_citation"`.
PlaceCitation A place citation annotation.
end_index integer (optional) End of the attributed segment, exclusive.
name string (optional) Title of the place.
place_id string (optional) The ID of the place, in \`places/{place_id}\` format.
review_snippets array (ReviewSnippet) (optional) Snippets of reviews that are used to generate answers about the
features of a given place in Google Maps.
Encapsulates a snippet of a user review that answers a question about
the features of a specific place in Google Maps.

#### Fields

review_id string (optional) The ID of the review snippet.
title string (optional) Title of the review.
url string (optional) A link that corresponds to the user review on Google Maps.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
type object (required) No description provided.

Always set to `"place_citation"`.
url string (optional) URI reference of the place.
UrlCitation A URL citation annotation.
end_index integer (optional) End of the attributed segment, exclusive.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
title string (optional) The title of the URL.
type object (required) No description provided.

Always set to `"url_citation"`.
url string (optional) The URL.
WordInfo Word-level ASR annotation for transcription output.
Carries the word text, optional timing, and optional speaker attribution.
end_index integer (optional) End of the attributed segment, exclusive.
end_offset string (optional) End offset in time of the word relative to the start of the audio.
Present when timestamp_granularities contains "word".
speaker string (optional) Optional. Speaker label for this word (e.g. "spk_1", "spk_2").
Present when diarization_mode is set in TranscriptionConfig.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
start_offset string (optional) Start offset in time of the word relative to the start of the audio.
Present when timestamp_granularities contains "word".
text string (optional) The transcribed word.
type object (required) No description provided.

Always set to `"word_info"`.
type object (required) No description provided.

Always set to `"text_annotation_delta"`.
TextDelta <br />

text string (required) No description provided.
type object (required) No description provided.

Always set to `"text"`.
ThoughtSignatureDelta <br />

signature string (optional) Signature to match the backend source to be part of the generation.
type object (required) No description provided.

Always set to `"thought_signature"`.
ThoughtSummaryDelta <br />

content [Content](https://ai.google.dev/api/interactions-api#Resource:Content) (optional) A new summary item to be added to the thought.
type object (required) No description provided.

Always set to `"thought_summary"`.
UrlContextCallDelta <br />

arguments UrlContextCallArguments (required) No description provided.
The arguments to pass to the URL context.

#### Fields

urls array (string) (optional) The URLs to fetch.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"url_context_call"`.
UrlContextResultDelta <br />

is_error boolean (optional) No description provided.
result array (UrlContextResult) (required) No description provided.
The result of the URL context.

#### Fields

status enum (string) (optional) The status of the URL retrieval.

Possible
values:

- `success`

  Url retrieval is successful.
- `error`

  Url retrieval is failed due to error.
- `paywall`

  Url retrieval is failed because the content is behind paywall.
- `unsafe`

  Url retrieval is failed because the content is unsafe.
url string (optional) The URL that was fetched.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"url_context_result"`.
VideoDelta <br />

data string (optional) No description provided.
mime_type enum (string) (optional) No description provided.

Possible
values:

- `video/mp4`

  MP4 video format
- `video/mpeg`

  MPEG video format
- `video/mpg`

  MPG video format
- `video/mov`

  MOV video format
- `video/avi`

  AVI video format
- `video/x-flv`

  FLV video format
- `video/webm`

  WebM video format
- `video/wmv`

  WMV video format
- `video/3gpp`

  3GPP video format
resolution MediaResolution (optional) The resolution of the media.
<br />

#### Possible values

- `low`

  Low resolution.
- `medium`

  Medium resolution.
- `high`

  High resolution.
- `ultra_high`

  Ultra high resolution.
type object (required) No description provided.

Always set to `"video"`.
uri string (optional) No description provided.
event_id string (optional) The event_id token to be used to resume the interaction stream, from
this event.
event_type object (required) No description provided.

Always set to `"step.delta"`.
index integer (required) No description provided.
metadata StepDeltaMetadata (optional) Optional metadata accompanying ANY streamed event.
Optional metadata accompanying ANY streamed event.

#### Fields

total_usage Usage (optional) Statistics on the interaction request's token usage.
Statistics on the interaction request's token usage.

#### Fields

cached_tokens_by_modality array (ModalityTokens) (optional) A breakdown of cached token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
grounding_tool_count array (GroundingToolCount) (optional) Grounding tool count.
The number of grounding tool counts.

#### Fields

count integer (optional) The number of grounding tool counts.
type enum (string) (optional) The grounding tool type associated with the count.

Possible
values:

- `google_search`

  Grounding with Google Web Search and Image Search, \& Web Grounding
  for Enterprise.
- `google_maps`

  Grounding with Google Maps.
- `retrieval`

  Grounding with customer's data, for example, VertexAISearch.
input_tokens_by_modality array (ModalityTokens) (optional) A breakdown of input token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
output_tokens_by_modality array (ModalityTokens) (optional) A breakdown of output token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
tool_use_tokens_by_modality array (ModalityTokens) (optional) A breakdown of tool-use token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
total_cached_tokens integer (optional) Number of tokens in the cached part of the prompt (the cached content).
total_input_tokens integer (optional) Number of tokens in the prompt (context).
total_output_tokens integer (optional) Total number of tokens across all the generated responses.
total_thought_tokens integer (optional) Number of tokens of thoughts for thinking models.
total_tokens integer (optional) Total token count for the interaction request (prompt + responses + other
internal tokens).
total_tool_use_tokens integer (optional) Number of tokens present in tool-use prompt(s).
StepStart <br />

event_id string (optional) The event_id token to be used to resume the interaction stream, from
this event.
event_type object (required) No description provided.

Always set to `"step.start"`.
index integer (required) No description provided.
metadata StreamMetadata (optional) Optional metadata accompanying ANY streamed event.
<br />

#### Fields

total_usage Usage (optional) No description provided.
Statistics on the interaction request's token usage.

#### Fields

cached_tokens_by_modality array (ModalityTokens) (optional) A breakdown of cached token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
grounding_tool_count array (GroundingToolCount) (optional) Grounding tool count.
The number of grounding tool counts.

#### Fields

count integer (optional) The number of grounding tool counts.
type enum (string) (optional) The grounding tool type associated with the count.

Possible
values:

- `google_search`

  Grounding with Google Web Search and Image Search, \& Web Grounding
  for Enterprise.
- `google_maps`

  Grounding with Google Maps.
- `retrieval`

  Grounding with customer's data, for example, VertexAISearch.
input_tokens_by_modality array (ModalityTokens) (optional) A breakdown of input token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
output_tokens_by_modality array (ModalityTokens) (optional) A breakdown of output token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
tool_use_tokens_by_modality array (ModalityTokens) (optional) A breakdown of tool-use token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
total_cached_tokens integer (optional) Number of tokens in the cached part of the prompt (the cached content).
total_input_tokens integer (optional) Number of tokens in the prompt (context).
total_output_tokens integer (optional) Total number of tokens across all the generated responses.
total_thought_tokens integer (optional) Number of tokens of thoughts for thinking models.
total_tokens integer (optional) Total token count for the interaction request (prompt + responses + other
internal tokens).
total_tool_use_tokens integer (optional) Number of tokens present in tool-use prompt(s).
step [Step](https://ai.google.dev/api/interactions-api#Resource:Step) (required) No description provided.
StepStop <br />

event_id string (optional) The event_id token to be used to resume the interaction stream, from
this event.
event_type object (required) No description provided.

Always set to `"step.stop"`.
index integer (required) No description provided.
metadata StreamMetadata (optional) Optional metadata accompanying ANY streamed event.
<br />

#### Fields

total_usage Usage (optional) No description provided.
Statistics on the interaction request's token usage.

#### Fields

cached_tokens_by_modality array (ModalityTokens) (optional) A breakdown of cached token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
grounding_tool_count array (GroundingToolCount) (optional) Grounding tool count.
The number of grounding tool counts.

#### Fields

count integer (optional) The number of grounding tool counts.
type enum (string) (optional) The grounding tool type associated with the count.

Possible
values:

- `google_search`

  Grounding with Google Web Search and Image Search, \& Web Grounding
  for Enterprise.
- `google_maps`

  Grounding with Google Maps.
- `retrieval`

  Grounding with customer's data, for example, VertexAISearch.
input_tokens_by_modality array (ModalityTokens) (optional) A breakdown of input token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
output_tokens_by_modality array (ModalityTokens) (optional) A breakdown of output token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
tool_use_tokens_by_modality array (ModalityTokens) (optional) A breakdown of tool-use token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
total_cached_tokens integer (optional) Number of tokens in the cached part of the prompt (the cached content).
total_input_tokens integer (optional) Number of tokens in the prompt (context).
total_output_tokens integer (optional) Total number of tokens across all the generated responses.
total_thought_tokens integer (optional) Number of tokens of thoughts for thinking models.
total_tokens integer (optional) Total token count for the interaction request (prompt + responses + other
internal tokens).
total_tool_use_tokens integer (optional) Number of tokens present in tool-use prompt(s).
step_usage Usage (optional) Model usage stats for this specific step.
Statistics on the interaction request's token usage.

#### Fields

cached_tokens_by_modality array (ModalityTokens) (optional) A breakdown of cached token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
grounding_tool_count array (GroundingToolCount) (optional) Grounding tool count.
The number of grounding tool counts.

#### Fields

count integer (optional) The number of grounding tool counts.
type enum (string) (optional) The grounding tool type associated with the count.

Possible
values:

- `google_search`

  Grounding with Google Web Search and Image Search, \& Web Grounding
  for Enterprise.
- `google_maps`

  Grounding with Google Maps.
- `retrieval`

  Grounding with customer's data, for example, VertexAISearch.
input_tokens_by_modality array (ModalityTokens) (optional) A breakdown of input token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
output_tokens_by_modality array (ModalityTokens) (optional) A breakdown of output token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
tool_use_tokens_by_modality array (ModalityTokens) (optional) A breakdown of tool-use token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
total_cached_tokens integer (optional) Number of tokens in the cached part of the prompt (the cached content).
total_input_tokens integer (optional) Number of tokens in the prompt (context).
total_output_tokens integer (optional) Total number of tokens across all the generated responses.
total_thought_tokens integer (optional) Number of tokens of thoughts for thinking models.
total_tokens integer (optional) Total token count for the interaction request (prompt + responses + other
internal tokens).
total_tool_use_tokens integer (optional) Number of tokens present in tool-use prompt(s).
usage Usage (optional) Cumulative model usage stats from the start of the session.
Statistics on the interaction request's token usage.

#### Fields

cached_tokens_by_modality array (ModalityTokens) (optional) A breakdown of cached token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
grounding_tool_count array (GroundingToolCount) (optional) Grounding tool count.
The number of grounding tool counts.

#### Fields

count integer (optional) The number of grounding tool counts.
type enum (string) (optional) The grounding tool type associated with the count.

Possible
values:

- `google_search`

  Grounding with Google Web Search and Image Search, \& Web Grounding
  for Enterprise.
- `google_maps`

  Grounding with Google Maps.
- `retrieval`

  Grounding with customer's data, for example, VertexAISearch.
input_tokens_by_modality array (ModalityTokens) (optional) A breakdown of input token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
output_tokens_by_modality array (ModalityTokens) (optional) A breakdown of output token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
tool_use_tokens_by_modality array (ModalityTokens) (optional) A breakdown of tool-use token usage by modality.
The token count for a single response modality.

#### Fields

modality ResponseModality (optional) The modality associated with the token count.
<br />

#### Possible values

- `text`

  Indicates the model should return text.
- `image`

  Indicates the model should return images.
- `audio`

  Indicates the model should return audio.
- `video`

  Indicates the model should return video.
- `document`

  Indicates the model should return documents.
tokens integer (optional) Number of tokens for the modality.
total_cached_tokens integer (optional) Number of tokens in the cached part of the prompt (the cached content).
total_input_tokens integer (optional) Number of tokens in the prompt (context).
total_output_tokens integer (optional) Total number of tokens across all the generated responses.
total_thought_tokens integer (optional) Number of tokens of thoughts for thinking models.
total_tokens integer (optional) Total token count for the interaction request (prompt + responses + other
internal tokens).
total_tool_use_tokens integer (optional) Number of tokens present in tool-use prompt(s).

### Examples

### Error Event

```json
{
  "error": {
    "code": "not_found",
    "message": "Failed to get completed interaction: Result not found."
  },
  "event_type": "error"
}
```

### Interaction Completed

```json
{
  "event_id": "evt_123",
  "event_type": "interaction.completed",
  "interaction": {
    "created": "2025-12-04T15:01:45Z",
    "id": "v1_ChdXS0l4YWZXTk9xbk0xZThQczhEcmlROBIXV0tJeGFmV05PcW5NMWU4UHM4RHJpUTg",
    "model": "gemini-3.6-flash",
    "status": "completed",
    "updated": "2025-12-04T15:01:45Z"
  }
}
```

### Interaction Completed

```json
{
  "event_id": "evt_123",
  "event_type": "interaction.completed",
  "interaction": {
    "created": "2025-12-04T15:01:45Z",
    "id": "v1_ChdXS0l4YWZXTk9xbk0xZThQczhEcmlROBIXV0tJeGFmV05PcW5NMWU4UHM4RHJpUTg",
    "model": "gemini-3-flash-preview",
    "object": "interaction",
    "status": "completed",
    "updated": "2025-12-04T15:01:45Z"
  }
}
```

### Interaction Created

```json
{
  "event_id": "evt_123",
  "event_type": "interaction.created",
  "interaction": {
    "created": "2025-12-04T15:01:45Z",
    "id": "v1_ChdXS0l4YWZXTk9xbk0xZThQczhEcmlROBIXV0tJeGFmV05PcW5NMWU4UHM4RHJpUTg",
    "model": "gemini-3.6-flash",
    "status": "in_progress",
    "updated": "2025-12-04T15:01:45Z"
  }
}
```

### Interaction Created

```json
{
  "event_id": "evt_123",
  "event_type": "interaction.created",
  "interaction": {
    "id": "v1_ChdXS0l4YWZXTk9xbk0xZThQczhEcmlROBIXV0tJeGFmV05PcW5NMWU4UHM4RHJpUTg",
    "model": "gemini-3-flash-preview",
    "object": "interaction",
    "status": "in_progress"
  }
}
```

### Interaction Status Update

```json
{
  "event_type": "interaction.status_update",
  "interaction_id": "v1_ChdTMjQ0YWJ5TUF1TzcxZThQdjRpcnFRcxIXUzI0NGFieU1BdU83MWU4UHY0aXJxUXM",
  "status": "in_progress"
}
```

### Step Delta

```json
{
  "delta": {
    "type": "text",
    "text": "Hello"
  },
  "event_type": "step.delta",
  "index": 0
}
```

### Step Start

```json
{
  "event_type": "step.start",
  "index": 0,
  "step": {
    "type": "model_output"
  }
}
```

### Step Stop

```json
{
  "event_type": "step.stop",
  "index": 0
}
```

### ResponseFormat

<br />

### Possible Types

AudioResponseFormat Configuration for audio output format.
bit_rate integer (optional) Bit rate in bits per second (bps). Only applicable for compressed formats
(MP3, Opus).
delivery enum (string) (optional) The delivery mode for the audio output.

Possible
values:

- `inline`

  Audio data is returned inline in the response.
- `uri`

  Audio data is returned as a URI.
mime_type enum (string) (optional) The MIME type of the audio output.

Possible
values:

- `audio/mp3`

  MP3 audio format.
- `audio/ogg_opus`

  OGG Opus audio format.
- `audio/l16`

  Raw PCM (L16) audio format.
- `audio/wav`

  WAV audio format.
- `audio/alaw`

  A-law audio format.
- `audio/mulaw`

  Mu-law audio format.
sample_rate integer (optional) Sample rate in Hz.
type object (required) No description provided.

Always set to `"audio"`.
ImageResponseFormat Configuration for image output format.
aspect_ratio enum (string) (optional) The aspect ratio for the image output.

Possible
values:

- `1:1`

  1:1 aspect ratio.
- `2:3`

  2:3 aspect ratio.
- `3:2`

  3:2 aspect ratio.
- `3:4`

  3:4 aspect ratio.
- `4:3`

  4:3 aspect ratio.
- `4:5`

  4:5 aspect ratio.
- `5:4`

  5:4 aspect ratio.
- `9:16`

  9:16 aspect ratio.
- `16:9`

  16:9 aspect ratio.
- `21:9`

  21:9 aspect ratio.
- `1:8`

  1:8 aspect ratio.
- `8:1`

  8:1 aspect ratio.
- `1:4`

  1:4 aspect ratio.
- `4:1`

  4:1 aspect ratio.
delivery enum (string) (optional) The delivery mode for the image output.

Possible
values:

- `inline`

  Image data is returned inline in the response.
- `uri`

  Image data is returned as a URI.
image_size enum (string) (optional) The size of the image output.

Possible
values:

- `512`

  512px image size.
- `1K`

  1K image size.
- `2K`

  2K image size.
- `4K`

  4K image size.
mime_type enum (string) (optional) The MIME type of the image output.

Possible
values:

- `image/jpeg`

  JPEG image format.
type object (required) No description provided.

Always set to `"image"`.
TextResponseFormat Configuration for text output format.
mime_type enum (string) (optional) The MIME type of the text output.

Possible
values:

- `application/json`

  JSON output format.
- `text/plain`

  Plain text output format.
schema object (optional) The JSON schema that the output should conform to. Only applicable when
mime_type is application/json.
type object (required) No description provided.

Always set to `"text"`.
VideoResponseFormat Configuration for video output format.
aspect_ratio enum (string) (optional) The aspect ratio for the video output.

Possible
values:

- `16:9`

  16:9 aspect ratio.
- `9:16`

  9:16 aspect ratio.
delivery enum (string) (optional) The delivery mode for the video output.

Possible
values:

- `inline`

  Video data is returned inline in the response.
- `uri`

  Video data is returned as a URI.
duration string (optional) The duration for the video output.
gcs_uri string (optional) The GCS URI to store the video output. Required for Vertex if delivery mode
is URI.
type object (required) No description provided.

Always set to `"video"`.

### Examples

### Audio Output

```json
{
  "type": "audio",
  "sample_rate": 24000
}
```

### Image Output

```json
{
  "type": "image",
  "aspect_ratio": "16:9",
  "image_size": "1K",
  "mime_type": "image/jpeg"
}
```

### Text Output (JSON Schema)

```json
{
  "type": "text",
  "mime_type": "application/json",
  "schema": {
    "type": "object",
    "properties": {
      "ingredients": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "recipe_name": {
        "type": "string"
      }
    },
    "required": [
      "ingredients",
      "recipe_name"
    ]
  }
}
```

### Video Output

```json
{
  "type": "video",
  "aspect_ratio": "16:9",
  "delivery": "inline"
}
```

### Step

A step in the interaction.

### Possible Types

CodeExecutionCallStep Code execution call step.
arguments CodeExecutionCallStepArguments (required) Required. The arguments to pass to the code execution.
The arguments to pass to the code execution.

#### Fields

code string (optional) The code to be executed.
language enum (string) (optional) Programming language of the \`code\`.

Possible
values:

- `python`

  Python \>= 3.10, with numpy and simpy available.
id string (required) Required. A unique ID for this specific tool call.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"code_execution_call"`.
CodeExecutionResultStep Code execution result step.
call_id string (required) Required. ID to match the ID from the function call block.
is_error boolean (optional) Whether the code execution resulted in an error.
result string (required) Required. The output of the code execution.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"code_execution_result"`.
FileSearchCallStep File Search call step.
id string (required) Required. A unique ID for this specific tool call.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"file_search_call"`.
FileSearchResultStep File Search result step.
call_id string (required) Required. ID to match the ID from the function call block.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"file_search_result"`.
FunctionCallStep A function tool call step.
arguments object (required) Required. The arguments to pass to the function.
id string (required) Required. A unique ID for this specific tool call.
name string (required) Required. The name of the tool to call.
type object (required) No description provided.

Always set to `"function_call"`.
FunctionResultStep Result of a function tool call.
call_id string (required) Required. ID to match the ID from the function call block.
is_error boolean (optional) Whether the tool call resulted in an error.
name string (optional) The name of the tool that was called.
result array ([ImageContent](https://ai.google.dev/api/interactions-api#Resource:ImageContent) or [TextContent](https://ai.google.dev/api/interactions-api#Resource:TextContent)) or object or string (required) Required. The result of the tool call.
type object (required) No description provided.

Always set to `"function_result"`.
GoogleMapsCallStep Google Maps call step.
arguments GoogleMapsCallStepArguments (optional) The arguments to pass to the Google Maps tool.
The arguments to pass to the Google Maps tool.

#### Fields

queries array (string) (optional) The queries to be executed.
id string (required) Required. A unique ID for this specific tool call.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"google_maps_call"`.
GoogleMapsResultStep Google Maps result step.
call_id string (required) Required. ID to match the ID from the function call block.
result array (GoogleMapsResultItem) (required) No description provided.
The result of the Google Maps.

#### Fields

places array (GoogleMapsResultPlaces) (optional) No description provided.
<br />

#### Fields

name string (optional) No description provided.
place_id string (optional) No description provided.
review_snippets array (ReviewSnippet) (optional) No description provided.
Encapsulates a snippet of a user review that answers a question about
the features of a specific place in Google Maps.

#### Fields

review_id string (optional) The ID of the review snippet.
title string (optional) Title of the review.
url string (optional) A link that corresponds to the user review on Google Maps.
url string (optional) No description provided.
widget_context_token string (optional) No description provided.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"google_maps_result"`.
GoogleSearchCallStep Google Search call step.
arguments GoogleSearchCallStepArguments (required) Required. The arguments to pass to Google Search.
The arguments to pass to Google Search.

#### Fields

queries array (string) (optional) Web search queries for the following-up web search.
id string (required) Required. A unique ID for this specific tool call.
search_type enum (string) (optional) The type of search grounding enabled.

Possible
values:

- `web_search`

  Setting this field enables web search. Only text results are returned.
- `image_search`

  Setting this field enables image search. Image bytes are returned.
- `enterprise_web_search`

  Setting this field enables enterprise web search.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"google_search_call"`.
GoogleSearchResultStep Google Search result step.
call_id string (required) Required. ID to match the ID from the function call block.
is_error boolean (optional) Whether the Google Search resulted in an error.
result array (GoogleSearchResultItem) (required) Required. The results of the Google Search.
The result of the Google Search.

#### Fields

search_suggestions string (optional) Web content snippet that can be embedded in a web page or an app webview.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"google_search_result"`.
McpServerToolCallStep MCPServer tool call step.
arguments object (required) Required. The JSON object of arguments for the function.
id string (required) Required. A unique ID for this specific tool call.
name string (required) Required. The name of the tool which was called.
server_name string (required) Required. The name of the used MCP server.
type object (required) No description provided.

Always set to `"mcp_server_tool_call"`.
McpServerToolResultStep MCPServer tool result step.
call_id string (required) Required. ID to match the ID from the function call block.
name string (optional) Name of the tool which is called for this specific tool call.
result array ([ImageContent](https://ai.google.dev/api/interactions-api#Resource:ImageContent) or [TextContent](https://ai.google.dev/api/interactions-api#Resource:TextContent)) or object or string (required) Required. The output from the MCP server call. Can be simple text or rich content.
server_name string (optional) The name of the used MCP server.
type object (required) No description provided.

Always set to `"mcp_server_tool_result"`.
ModelOutputStep Output generated by the model.
content array ([Content](https://ai.google.dev/api/interactions-api#Resource:Content)) (optional) No description provided.
error Status (optional) The error result of the operation in case of failure or cancellation.
The \`Status\` type defines a logical error model that is suitable for
different programming environments, including REST APIs and RPC APIs. It is
used by \[gRPC\](https://github.com/grpc). Each \`Status\` message contains
three pieces of data: error code, error message, and error details.

You can find out more about this error model and how to work with it in the
\[API Design Guide\](https://cloud.google.com/apis/design/errors).

#### Fields

code integer (optional) The status code, which should be an enum value of google.rpc.Code.
details array (object) (optional) A list of messages that carry the error details. There is a common set of
message types for APIs to use.
message string (optional) A developer-facing error message, which should be in English. Any
user-facing error message should be localized and sent in the
google.rpc.Status.details field, or localized by the client.
type object (required) No description provided.

Always set to `"model_output"`.
ThoughtStep A thought step.
signature string (optional) A signature hash for backend validation.
summary array (ThoughtSummaryContent) (optional) A summary of the thought.
<br />

#### Possible Types

ImageContent An image content block.
data string (optional) The image content.
mime_type enum (string) (optional) The mime type of the image.

Possible
values:

- `image/png`

  PNG image format
- `image/jpeg`

  JPEG image format
- `image/webp`

  WebP image format
- `image/heic`

  HEIC image format
- `image/heif`

  HEIF image format
- `image/gif`

  GIF image format
- `image/bmp`

  BMP image format
- `image/tiff`

  TIFF image format
resolution MediaResolution (optional) The resolution of the media.
<br />

#### Possible values

- `low`

  Low resolution.
- `medium`

  Medium resolution.
- `high`

  High resolution.
- `ultra_high`

  Ultra high resolution.
type object (required) No description provided.

Always set to `"image"`.
uri string (optional) The URI of the image.
TextContent A text content block.
annotations array (Annotation) (optional) Citation information for model-generated content.
Citation information for model-generated content.

#### Possible Types

FileCitation A file citation annotation.
custom_metadata object (optional) User provided metadata about the retrieved context.
document_uri string (optional) The URI of the file.
end_index integer (optional) End of the attributed segment, exclusive.
file_name string (optional) The name of the file.
media_id string (optional) Media ID in-case of image citations, if applicable.
page_number integer (optional) Page number of the cited document, if applicable.
source string (optional) Source attributed for a portion of the text.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
type object (required) No description provided.

Always set to `"file_citation"`.
PlaceCitation A place citation annotation.
end_index integer (optional) End of the attributed segment, exclusive.
name string (optional) Title of the place.
place_id string (optional) The ID of the place, in \`places/{place_id}\` format.
review_snippets array (ReviewSnippet) (optional) Snippets of reviews that are used to generate answers about the
features of a given place in Google Maps.
Encapsulates a snippet of a user review that answers a question about
the features of a specific place in Google Maps.

#### Fields

review_id string (optional) The ID of the review snippet.
title string (optional) Title of the review.
url string (optional) A link that corresponds to the user review on Google Maps.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
type object (required) No description provided.

Always set to `"place_citation"`.
url string (optional) URI reference of the place.
UrlCitation A URL citation annotation.
end_index integer (optional) End of the attributed segment, exclusive.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
title string (optional) The title of the URL.
type object (required) No description provided.

Always set to `"url_citation"`.
url string (optional) The URL.
WordInfo Word-level ASR annotation for transcription output.
Carries the word text, optional timing, and optional speaker attribution.
end_index integer (optional) End of the attributed segment, exclusive.
end_offset string (optional) End offset in time of the word relative to the start of the audio.
Present when timestamp_granularities contains "word".
speaker string (optional) Optional. Speaker label for this word (e.g. "spk_1", "spk_2").
Present when diarization_mode is set in TranscriptionConfig.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
start_offset string (optional) Start offset in time of the word relative to the start of the audio.
Present when timestamp_granularities contains "word".
text string (optional) The transcribed word.
type object (required) No description provided.

Always set to `"word_info"`.
text string (required) Required. The text content.
type object (required) No description provided.

Always set to `"text"`.
type object (required) No description provided.

Always set to `"thought"`.
UrlContextCallStep URL context call step.
arguments UrlContextCallArguments (required) Required. The arguments to pass to the URL context.
The arguments to pass to the URL context.

#### Fields

urls array (string) (optional) The URLs to fetch.
id string (required) Required. A unique ID for this specific tool call.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"url_context_call"`.
UrlContextResultStep URL context result step.
call_id string (required) Required. ID to match the ID from the function call block.
is_error boolean (optional) Whether the URL context resulted in an error.
result array (UrlContextResult) (required) Required. The results of the URL context.
The result of the URL context.

#### Fields

status enum (string) (optional) The status of the URL retrieval.

Possible
values:

- `success`

  Url retrieval is successful.
- `error`

  Url retrieval is failed due to error.
- `paywall`

  Url retrieval is failed because the content is behind paywall.
- `unsafe`

  Url retrieval is failed because the content is unsafe.
url string (optional) The URL that was fetched.
signature string (optional) A signature hash for backend validation.
type object (required) No description provided.

Always set to `"url_context_result"`.
UserInputStep Input provided by the user.
content array ([Content](https://ai.google.dev/api/interactions-api#Resource:Content)) (optional) No description provided.
type object (required) No description provided.

Always set to `"user_input"`.

### Examples

### CodeExecutionCallStep

```json
{
  "type": "code_execution_call",
  "arguments": {
    "code": "print(sum(range(1, 11)))"
  },
  "id": "code_call_71021"
}
```

### CodeExecutionResultStep

```json
{
  "type": "code_execution_result",
  "call_id": "code_call_71021",
  "result": "55\n"
}
```

### FileSearchCallStep

```json
{
  "type": "file_search_call",
  "id": "file_call_88192"
}
```

### FileSearchResultStep

```json
{
  "type": "file_search_result",
  "call_id": "file_call_88192"
}
```

### FunctionCallStep

```json
{
  "name": "get_weather",
  "type": "function_call",
  "arguments": {
    "location": "Boston, MA"
  },
  "id": "call_98231"
}
```

### FunctionResultStep

```json
{
  "name": "get_weather",
  "type": "function_result",
  "call_id": "call_98231",
  "result": [
    {
      "type": "text",
      "text": "{\"weather\":\"sunny\"}"
    }
  ]
}
```

### GoogleMapsCallStep

```json
{
  "type": "google_maps_call",
  "arguments": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "id": "maps_call_39201"
}
```

### GoogleMapsResultStep

```json
{
  "type": "google_maps_result",
  "call_id": "maps_call_39201",
  "result": [
    {
      "name": "Golden Gate Park",
      "place_id": "ChIJIQBpAG2ahYAR9R7bNdTLg8M",
      "rating": 4.8
    }
  ]
}
```

### GoogleSearchCallStep

```json
{
  "type": "google_search_call",
  "arguments": {
    "query": "Who won the men's 100m in Paris 2024?"
  },
  "id": "search_call_19201"
}
```

### GoogleSearchResultStep

```json
{
  "type": "google_search_result",
  "call_id": "search_call_19201",
  "result": [
    {
      "title": "Paris 2024 Olympics: Noah Lyles wins men's 100m gold",
      "url": "https://olympics.com/en/news/paris-2024-noah-lyles-wins-mens-100m-gold",
      "snippet": "American Noah Lyles won the Olympic men's 100m gold medal in a photo finish."
    }
  ]
}
```

### McpServerToolCallStep

```json
{
  "name": "calculate_tax",
  "type": "mcp_server_tool_call",
  "arguments": {
    "income": 120000,
    "state": "CA"
  },
  "id": "mcp_call_29012",
  "server_name": "financial_mcp_server"
}
```

### McpServerToolResultStep

```json
{
  "type": "mcp_server_tool_result",
  "call_id": "mcp_call_29012",
  "result": {
    "tax_due": 32400
  }
}
```

### ModelOutputStep

```json
{
  "type": "model_output",
  "content": [
    {
      "type": "text",
      "text": "The capital of France is Paris."
    }
  ]
}
```

### ThoughtStep

```json
{
  "type": "thought",
  "signature": "thought_sig_abcd1234",
  "summary": [
    {
      "type": "text",
      "text": "The model is searching Google for the capital of France."
    }
  ]
}
```

### UrlContextCallStep

```json
{
  "type": "url_context_call",
  "arguments": {
    "urls": [
      "https://www.example.com"
    ]
  },
  "id": "url_call_10219"
}
```

### UrlContextResultStep

```json
{
  "type": "url_context_result",
  "call_id": "url_call_10219",
  "result": [
    {
      "title": "Example Domain",
      "url": "https://www.example.com",
      "snippet": "This domain is for use in illustrative examples in documents."
    }
  ]
}
```

### UserInputStep

```json
{
  "type": "user_input",
  "content": [
    {
      "type": "text",
      "text": "What is the capital of France?"
    }
  ]
}
```

### EnvironmentConfig

Configuration for a custom environment.

#### Fields

environment_id string (optional) Optional. The environment ID for the interaction. If specified, the request will
update the existing environment instead of creating a new one.
network [EnvironmentNetworkEgressAllowlist](https://ai.google.dev/api/interactions-api#Resource:EnvironmentNetworkEgressAllowlist) or enum (string) (optional) Network configuration for the environment.

Possible
values:

- `disabled`

  Turns all network off.
sources array (Source) (optional) No description provided.
A source to be mounted into the environment.

#### Fields

content string (optional) The inline content if \`type\` is \`INLINE\`.
encoding string (optional) Optional encoding for inline content (e.g. \`base64\`).
source string (optional) The source of the environment.
For GCS, this is the GCS path.
For GitHub, this is the GitHub path.
target string (optional) Where the source should appear in the environment.
type enum (string) (optional) No description provided.

Possible
values:

- `gcs`

  A GCS bucket.
- `inline`

  Inline content.
- `repository`

  A generic repository. The protocol prefix in the source URL
  identifies the provider (e.g., github://, gcs://).
- `skill_registry`

  A skill resource from the Skill Registry Service.
  Skill: projects/{project}/locations/{location}/skills/{skill}
  SkillRevision:
  projects/{project}/locations/{location}/skills/{skill}/revisions/{revision}
  Support mounting all skills under a project:
  projects/{project}/locations/{location}/skills.
type object (optional) No description provided.

Always set to `"remote"`.

### Examples

### Inline Sources

```bash
{
  "type": "remote",
  "sources": [
    {
      "type": "inline",
      "content": "You are a data analyst. Always include visualizations and export results as PDF.",
      "target": ".agents/AGENTS.md"
    },
    {
      "type": "inline",
      "content": "---\nname: slide-maker\ndescription: Create HTML slide decks\n---\n# Slide Maker\n\nWhen asked to create a presentation:\n1. Analyze the input data\n2. Create an HTML slide deck with reveal.js\n3. Save to /workspace/output/slides.html",
      "target": ".agents/skills/slide-maker/SKILL.md"
    }
  ]
}
```

### External Sources

```bash
{
  "type": "remote",
  "sources": [
    {
      "type": "repository",
      "source": "https://github.com/my-org/my-skills.git",
      "target": ".agents/skills"
    },
    {
      "type": "gcs",
      "source": "gs://my-bucket/my-folder",
      "target": "/workspace/data"
    }
  ]
}
```

### Network Allowlist

```bash
{
  "type": "remote",
  "network": {
    "allowlist": [
      {
        "domain": "pypi.org"
      },
      {
        "domain": "*.github.com"
      }
    ]
  }
}
```

### Proxy Credentials

```bash
{
  "type": "remote",
  "network": {
    "allowlist": [
      {
        "domain": "api.github.com",
        "transform": {
          "Authorization": "Bearer YOUR_GITHUB_TOKEN"
        }
      }
    ]
  }
}
```

### EnvironmentNetworkEgressAllowlist

Outbound networking configuration for the sandbox. Accepts an object with an 'allowlist' array to restrict traffic, or the string 'disabled' to turn off all network access. Omit entirely to allow all outbound traffic with no header injection.

#### Possible Types

object Outbound networking configuration for the sandbox. When specified, restricts which external domains the sandbox can reach. Omit entirely to allow all outbound traffic with no header injection.
allowlist array (AllowlistEntry) (optional) List of allowed outbound domains. Only requests to listed domains are permitted. Use \[{'domain': '\*'}\] to allow all domains while still injecting headers on specific ones.
A single domain allowlist rule with optional header injection.

#### Fields

domain string (optional) Domain to allow outbound requests to. Supports wildcards (e.g. '\*.googleapis.com'). Use '\*' to allow all domains.
transform array (object) or object (optional) Headers to inject on all outbound requests matching this domain. Accepts a single dict or a list of dicts. The egress proxy injects these automatically.
string Turns all network off.

#### Possible values

- `disabled`

  Turns all network off.

### Examples

### Example

```bash
{
  "allowlist": [
    {
      "domain": "github.com",
      "transform": [
        {
          "Authorization": "Bearer your-token"
        }
      ]
    },
    {
      "domain": "*.googleapis.com"
    }
  ]
}
```

### ToolChoiceConfig

The tool choice configuration containing allowed tools.

#### Fields

allowed_tools AllowedTools (optional) The allowed tools.
The configuration for allowed tools.

#### Fields

mode enum (string) (optional) The mode of the tool choice.

Possible
values:

- `auto`

  Auto tool choice.
- `any`

  Any tool choice.
- `none`

  No tool choice.
- `validated`

  Validated tool choice.
tools array (string) (optional) The names of the allowed tools.

### Examples

### Example

```bash
{
  "allowed_tools": {
    "mode": "any",
    "tools": [
      "my_tool"
    ]
  }
}
```

### ImageContent

An image content block.

#### Fields

data string (optional) The image content.
mime_type enum (string) (optional) The mime type of the image.

Possible
values:

- `image/png`

  PNG image format
- `image/jpeg`

  JPEG image format
- `image/webp`

  WebP image format
- `image/heic`

  HEIC image format
- `image/heif`

  HEIF image format
- `image/gif`

  GIF image format
- `image/bmp`

  BMP image format
- `image/tiff`

  TIFF image format
resolution MediaResolution (optional) The resolution of the media.
<br />

#### Possible values

- `low`

  Low resolution.
- `medium`

  Medium resolution.
- `high`

  High resolution.
- `ultra_high`

  Ultra high resolution.
type object (optional) No description provided.

Always set to `"image"`.
uri string (optional) The URI of the image.

### Examples

### Image

```bash
{
  "type": "image",
  "data": "BASE64_ENCODED_IMAGE",
  "mime_type": "image/png"
}
```

### TextContent

A text content block.

#### Fields

annotations array (Annotation) (optional) Citation information for model-generated content.
Citation information for model-generated content.

#### Possible Types

FileCitation A file citation annotation.
custom_metadata object (optional) User provided metadata about the retrieved context.
document_uri string (optional) The URI of the file.
end_index integer (optional) End of the attributed segment, exclusive.
file_name string (optional) The name of the file.
media_id string (optional) Media ID in-case of image citations, if applicable.
page_number integer (optional) Page number of the cited document, if applicable.
source string (optional) Source attributed for a portion of the text.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
type object (required) No description provided.

Always set to `"file_citation"`.
PlaceCitation A place citation annotation.
end_index integer (optional) End of the attributed segment, exclusive.
name string (optional) Title of the place.
place_id string (optional) The ID of the place, in \`places/{place_id}\` format.
review_snippets array (ReviewSnippet) (optional) Snippets of reviews that are used to generate answers about the
features of a given place in Google Maps.
Encapsulates a snippet of a user review that answers a question about
the features of a specific place in Google Maps.

#### Fields

review_id string (optional) The ID of the review snippet.
title string (optional) Title of the review.
url string (optional) A link that corresponds to the user review on Google Maps.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
type object (required) No description provided.

Always set to `"place_citation"`.
url string (optional) URI reference of the place.
UrlCitation A URL citation annotation.
end_index integer (optional) End of the attributed segment, exclusive.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
title string (optional) The title of the URL.
type object (required) No description provided.

Always set to `"url_citation"`.
url string (optional) The URL.
WordInfo Word-level ASR annotation for transcription output.
Carries the word text, optional timing, and optional speaker attribution.
end_index integer (optional) End of the attributed segment, exclusive.
end_offset string (optional) End offset in time of the word relative to the start of the audio.
Present when timestamp_granularities contains "word".
speaker string (optional) Optional. Speaker label for this word (e.g. "spk_1", "spk_2").
Present when diarization_mode is set in TranscriptionConfig.
start_index integer (optional) Start of segment of the response that is attributed to this source.

Index indicates the start of the segment, measured in bytes.
start_offset string (optional) Start offset in time of the word relative to the start of the audio.
Present when timestamp_granularities contains "word".
text string (optional) The transcribed word.
type object (required) No description provided.

Always set to `"word_info"`.
text string (optional) Required. The text content.
type object (optional) No description provided.

Always set to `"text"`.

### Examples

### Text

```bash
{
  "type": "text",
  "text": "Hello, how are you?"
}
```