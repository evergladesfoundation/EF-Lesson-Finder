/** Host pieces the panel reset needs. Kept DOM-agnostic so smoke tests can fake it. */
export type ConversationResetHost = {
  body: { replaceChildren: () => void };
  input: { value: string };
};

/**
 * Clears the transcript so the next panel open re-shows the greeting and
 * quick prompts instead of the previous search.
 */
export function resetConversation(host: ConversationResetHost): {
  chipsEl: null;
  hasGreeted: false;
} {
  host.body.replaceChildren();
  host.input.value = "";
  return { chipsEl: null, hasGreeted: false };
}
