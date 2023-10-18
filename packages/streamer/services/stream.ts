import { StreamerConfig } from "../config";
import { BaseService, ServiceName } from "./base";
import shell from "shelljs";
import { ChildProcess, spawn } from "node:child_process";
import split2 from "split2";
import { Logger } from "@grimes/common/logger";
import { Broadcaster } from "../model";



export class VideoStreamService extends BaseService {
  private nginxProcess: ChildProcess;
  private broadcaster: Map<string, Broadcaster> = new Map();

  constructor(config: StreamerConfig) {
    super(config, "VideoStreamService");
  }

  public dependencies(): Array<ServiceName> {
    return [];
  }
  protected async onServiceStart(): Promise<void> {
    this.checkNginx();
    this.spawnNginx();
  }
  
  protected async onServiceStop(): Promise<void> {}

  private checkNginx() {
    // check if nginx is installed
    if (!shell.which("nginx")) {
      this.logger.error("nginx is not installed");
      shell.exit(1);
    }
  }

  private async spawnNginx() {
    const configFile = this.config.nginx.configFile;
    this.nginxProcess = spawn("nginx", ["-c", configFile], { stdio: "pipe" });
    const nginxLogger = new Logger("Nginx");
    this.nginxProcess.stderr.pipe(split2()).on("data", (data) => {
      nginxLogger.error(data);
    });
    this.nginxProcess.stdout.pipe(split2()).on("data", (data) => {
      nginxLogger.info(data);
    });
  }

  public startSessionForClient(clientName: string): Broadcaster {
    if (this.broadcaster.has(clientName)) {
      throw new Error("Broadcaster already exists");
    }
    const broadcaster = new Broadcaster(clientName, this.config.nginx.rtmpUrl);
    this.broadcaster.set(clientName, broadcaster);
    return broadcaster;
  }

}