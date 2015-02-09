## ps-nas in Production

- Create a separate config file for your production environments.
The [configuration](config.md) docs contain information about setting up a additional config files
and controlling them with environment variables.

- Consider enabling clustering.  Clustering is the simplest way to scale a Node.js server.
However, it's not the only way.
Some folks prefer to manage each instance individually, which involves launching multiple instances on separate ports
and using a load balancer to direct traffic to each server.

- Use a tool like forever.js or PM2 to keep the server running.

- Decide on a logging strategy.  There are a variety of ways to handle logging.
  1. Log to stdout (default) and pipe the output to a file. Use tools like logrotate to manage the logs
  2. Use the winston file transport to log to files and manage log rotation
  3. Use the [syslog transport](https://github.com/winstonjs/winston-syslog) to log to syslog.
  4. Use a cloud-based logging service like papertrail, which can be configured using transports.

- Set up a web server/reverse proxy in front of Node.js (Apache, nginx, IIS).
The DevOps teams will typically have things they like to enable in the web server,
like gzip compression or max header sizes.
It's easier to let that them configure it in the server rather than implement it from scratch in Node.js.

- Use [monitoring](monitor.md), ideally by installing a StatsD server.
