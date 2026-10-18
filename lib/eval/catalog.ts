import { EVAL_BANK } from "@/lib/eval/bank";
import { fillEval } from "@/lib/eval/fill";
import type { EvalTemplate } from "@/lib/eval/types";

export type EvalRow = {
  id: string;
  skillSlug: string;
  template: EvalTemplate;
  sample: Record<string, number>;
  sampleAnswer: string;
  samplePrompt: string;
};

export function evalItemId(index: number): string {
  return `22222222-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

export function evalRows(): EvalRow[] {
  return EVAL_BANK.map((template, index) => {
    const filled = fillEval(template, "pre", 1);
    return {
      id: evalItemId(index + 1),
      skillSlug: template.skill,
      template,
      sample: filled.values,
      sampleAnswer: String(filled.answer),
      samplePrompt: filled.prompt,
    };
  });
}
