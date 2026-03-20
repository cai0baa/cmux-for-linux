export interface AgentDefinition {
  id: string;
  name: string;
  /** Short description shown in UI */
  description: string;
  /** Shell command to launch this agent */
  command: string;
  /** Command arguments */
  args: string[];
  /** Icon identifier (emoji or icon name) */
  icon: string;
  /** Color accent for the pane header */
  color: string;
}
