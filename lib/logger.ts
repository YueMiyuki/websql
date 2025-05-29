import chalk from "chalk";

export type LogType = "info" | "info-batch" | "warn" | "error" | "debug" | "update";

function formatDate(): string {
  const dateObject = new Date();
  const date = `0${dateObject.getDate()}`.slice(-2);
  const month = `0${dateObject.getMonth() + 1}`.slice(-2);
  const year = dateObject.getFullYear();
  const hours = `0${dateObject.getHours()}`.slice(-2);
  const minutes = `0${dateObject.getMinutes()}`.slice(-2);
  const seconds = `0${dateObject.getSeconds()}`.slice(-2);
  return `${year}/${month}/${date} ${hours}:${minutes}:${seconds}`;
}

export function log(message: string, type: LogType = "info"): void {
  const formattedDate = formatDate();
  switch (type) {
    case "info":
      console.log(formattedDate, chalk.blue(`[INFO] ${message}`));
      break;
    case "warn":
      console.log(formattedDate, chalk.yellow(`[WARN] ${message}`));
      break;
    case "info-batch":
      console.log(formattedDate, chalk.yellow(`[BATCH] ${message}`));
      break;
    case "error":
      console.log(formattedDate, chalk.red(`[ERROR] ${message}`));
      break;
    case "debug":
      console.log(formattedDate, chalk.green(`[DEBUG] ${message}`));
      break;
    case "update":
      console.log(formattedDate, chalk.cyan(`[INFO] ${message}`));
      break;
    default:
      console.log(formattedDate, chalk.blue(`[WATCHER] ${message}`));
      type = "info";
  }
}
