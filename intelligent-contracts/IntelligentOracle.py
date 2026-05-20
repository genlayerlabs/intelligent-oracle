# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
import re
from datetime import datetime
from urllib.parse import urlparse

from genlayer import *
import genlayer.gl as gl


# Stored as plain strings on chain because Enum payloads are not natively
# encoded in GenVM storage.
_STATUS_ACTIVE = "Active"
_STATUS_RESOLVED = "Resolved"
_STATUS_ERROR = "Error"


def _normalize_domain(value: str) -> str:
    raw = value.strip().lower()
    if not raw:
        return ""

    candidate = raw if re.match(r"^[a-z][a-z0-9+\-.]*://", raw) else f"https://{raw}"
    parsed_url = urlparse(candidate)
    domain = parsed_url.netloc or parsed_url.path.split("/")[0]
    return domain.replace("www.", "")


class IntelligentOracle(gl.Contract):
    # Persistent storage fields
    prediction_market_id: str
    title: str
    description: str
    potential_outcomes: DynArray[str]
    rules: DynArray[str]
    data_source_domains: DynArray[str]
    resolution_urls: DynArray[str]
    earliest_resolution_date: str  # ISO 8601 string
    status: str
    analysis: str
    outcome: str
    creator: Address

    def __init__(
        self,
        prediction_market_id: str,
        title: str,
        description: str,
        potential_outcomes: list[str],
        rules: list[str],
        data_source_domains: list[str],
        resolution_urls: list[str],
        earliest_resolution_date: str,
    ):
        if (
            not prediction_market_id
            or not title
            or not description
            or not potential_outcomes
            or not rules
            or not earliest_resolution_date
        ):
            raise gl.vm.UserError("Missing required fields.")

        if not resolution_urls and not data_source_domains:
            raise gl.vm.UserError("Missing resolution URLs or data source domains.")

        if len(resolution_urls) > 0 and len(data_source_domains) > 0:
            raise gl.vm.UserError(
                "Cannot provide both resolution URLs and data source domains."
            )

        if len(potential_outcomes) < 2:
            raise gl.vm.UserError("At least two potential outcomes are required.")

        if len(potential_outcomes) != len(set(potential_outcomes)):
            raise gl.vm.UserError("Potential outcomes must be unique.")

        self.prediction_market_id = prediction_market_id
        self.title = title
        self.description = description

        for outcome in potential_outcomes:
            self.potential_outcomes.append(outcome.strip())

        for rule in rules:
            self.rules.append(rule)

        for datasource in data_source_domains:
            self.data_source_domains.append(_normalize_domain(datasource))

        for url in resolution_urls:
            self.resolution_urls.append(url.strip())

        self.earliest_resolution_date = earliest_resolution_date
        self.status = _STATUS_ACTIVE
        self.outcome = ""
        self.creator = gl.message.sender_address

    @gl.public.view
    def _check_evidence_domain(self, evidence: str) -> bool:
        try:
            evidence_domain = _normalize_domain(evidence)
            return evidence_domain in self.data_source_domains
        except Exception:
            return False

    @gl.public.write
    def resolve(self, evidence_url: str = "") -> None:
        if self.status == _STATUS_RESOLVED:
            raise gl.vm.UserError("Cannot resolve an already resolved oracle.")

        current_date = datetime.now().astimezone().date()
        earliest_date = datetime.fromisoformat(self.earliest_resolution_date).date()
        if current_date < earliest_date:
            raise gl.vm.UserError("Cannot resolve before the earliest resolution date.")

        if len(self.resolution_urls) > 0 and evidence_url:
            raise gl.vm.UserError(
                "An evidence URL was provided but the oracle is configured to use resolution URLs already provided."
            )

        if len(self.resolution_urls) == 0 and not evidence_url:
            raise gl.vm.UserError(
                "No evidence URL provided and the oracle is not configured to use resolution URLs."
            )

        if evidence_url:
            if not self._check_evidence_domain(evidence_url):
                raise gl.vm.UserError(
                    "The evidence URL does not match any of the data source domains."
                )

        analyzed_outputs = []
        resources_to_check = (
            list(self.resolution_urls) if len(self.resolution_urls) > 0 else [evidence_url]
        )

        title = self.title
        description = self.description
        potential_outcomes = list(self.potential_outcomes)
        rules = list(self.rules)
        earliest_resolution_date = self.earliest_resolution_date

        for resource_url in resources_to_check:

            def evaluate_single_source() -> str:
                resource_web_data = gl.nondet.web.render(
                    resource_url,
                    mode="text",
                    wait_after_loaded="10s",
                ) or ""

                task = f"""
You are an AI Validator tasked with resolving a prediction market.
Your goal is to determine the correct outcome based on the user-defined rules,
the provided webpage HTML content, the resolution date, and the list of potential outcomes.

### Inputs
<title>
{title}
</title>

<description>
{description}
</description>

<potential_outcomes>
{potential_outcomes}
</potential_outcomes>

<rules>
{rules}
</rules>

<source_url>
{resource_url}
</source_url>

<webpage_content>
{resource_web_data}
</webpage_content>

<current_date>
{datetime.now().astimezone()}
</current_date>

<earliest_resolution_date>
{earliest_resolution_date}
</earliest_resolution_date>

### Your Task
1. Analyze the inputs.
2. Provide reasoning that references rules and extracted data.
3. Determine the outcome:
   - Use one of the listed potential outcomes when possible.
   - Use `UNDETERMINED` if the information is insufficient or the event has not occurred.
   - Use `ERROR` if the determined outcome is not in the list.

### Output Format
Provide a valid JSON object with this exact structure:

{{
    "valid_source": "true | false",
    "event_has_occurred": "true | false",
    "reasoning": "Your detailed reasoning here",
    "outcome": "Chosen outcome from the potential outcomes list, `UNDETERMINED`, or `ERROR`"
}}

### Constraints
- Be accurate and objective.
- Output must be valid JSON without trailing commas.
"""
                return gl.nondet.exec_prompt(task)

            result = gl.eq_principle.prompt_comparative(
                evaluate_single_source,
                principle="`outcome` field must be exactly the same. All other fields must be similar",
            )

            analyzed_outputs.append((resource_url, _parse_json_dict(result)))

        def evaluate_all_sources() -> str:
            task = f"""
You are an AI Validator tasked with resolving a prediction market Oracle. Your goal is to determine
the correct outcome based on processed data from each individual data source.

### Inputs
<title>
{title}
</title>

<description>
{description}
</description>

<potential_outcomes>
{potential_outcomes}
</potential_outcomes>

<rules>
{rules}
</rules>

<processed_data>
{analyzed_outputs}
</processed_data>

<current_date>
{datetime.now().astimezone()}
</current_date>

<earliest_resolution_date>
{earliest_resolution_date}
</earliest_resolution_date>

### Your Task
1. Analyze the inputs and consider the resolution date.
2. Determine the outcome from the processed data:
   - One of the listed potential outcomes when possible.
   - `UNDETERMINED` if the information is insufficient or inconclusive.
   - `ERROR` if the determined outcome is not in the list.
   - If sources contradict, refer to the rules. If rules don't resolve it, use `ERROR`.

### Output Format
Valid JSON only:

{{
    "relevant_sources": ["..."],
    "reasoning": "Your detailed reasoning here",
    "outcome": "Chosen outcome from the potential outcomes list, `UNDETERMINED`, or `ERROR`"
}}

### Constraints
- Be accurate, objective, and clear.
- JSON must be valid (no trailing commas).
"""
            return gl.nondet.exec_prompt(task)

        result = gl.eq_principle.prompt_comparative(
            evaluate_all_sources,
            principle="`outcome` field must be exactly the same. All other fields must be similar",
        )

        result_dict = _parse_json_dict(result)
        self.analysis = json.dumps(result_dict)

        if result_dict.get("outcome") == "UNDETERMINED":
            return

        if (
            result_dict.get("outcome") == "ERROR"
            or result_dict.get("outcome") not in self.potential_outcomes
        ):
            self.status = _STATUS_ERROR
            return

        self.outcome = result_dict["outcome"]
        self.status = _STATUS_RESOLVED

    @gl.public.view
    def get_dict(self) -> dict:
        return {
            "title": self.title,
            "description": self.description,
            "potential_outcomes": list(self.potential_outcomes),
            "rules": list(self.rules),
            "data_source_domains": list(self.data_source_domains),
            "resolution_urls": list(self.resolution_urls),
            "status": self.status,
            "earliest_resolution_date": self.earliest_resolution_date,
            "analysis": self.analysis,
            "outcome": self.outcome,
            "prediction_market_id": self.prediction_market_id,
        }

    @gl.public.view
    def get_status(self) -> str:
        return self.status


def _parse_json_dict(json_str: str) -> dict:
    """
    Sanitize JSON output from the LLM:
    - keep only the substring between the first `{` and the last `}`
    - remove trailing commas before closing braces/brackets
    """
    if isinstance(json_str, dict):
        return json_str

    first_brace = json_str.find("{")
    last_brace = json_str.rfind("}")
    if first_brace == -1 or last_brace == -1:
        return {}
    json_str = json_str[first_brace : last_brace + 1]
    json_str = re.sub(r",(?!\s*?[\{\[\"\'\w])", "", json_str)
    return json.loads(json_str)
