import { taskService } from "../services/taskService";
import { resolveRequirementExamples, type CompletionRequirement } from "./completionMedia";

export function resolveTaskCompletionGuides(list?: CompletionRequirement[]) {
  return resolveRequirementExamples(list ?? [], (file) => taskService.uploadPhoto(file));
}
