# Loki Logs Retrieval Script

This script is designed to query Loki via Grafana to retrieve logs efficiently, even when dealing with more than 5000 lines. The script allows you to adjust the interval (resolution between two calls to Grafana) and the start time. The end time is fixed to the current time.

## Prerequisites

- Node.js installed on your machine.
- A valid cookie from the Grafana dashboard.

## Configuration

Before running the script, ensure that you have a `config.json` file in the same directory as the script. The `config.json` file should contain the necessary configuration details, including the output file name, the query expression, the interval, the start time, and the cookie for authentication.

### `config.json` Structure

```json
{
  "outputFileName": "logs.txt",
  "maxLines": 5000,
  "interval": 600000,
  "startTime": "2024-07-09T12:00:00Z",
  "expr": "{logtype=\"application\", service=\"frontend-monorepo-nextjs-us\", namespace=\"app\", level=~\"ERROR|CRITICAL|FATAL|EMERGENCY|WARN\"} |~ `Fetching user experiments time:` | json | line_format `{{.json_message}}` | regexp `(?P<time>[0-9.]+)ms` | line_format `{{.time}}`",
  "cookie": "your_cookie_here"
}
```

- **outputFileName**: The name of the file where the logs will be saved.
- **maxLines**: The maximum number of log lines to retrieve per query.
- **interval**: The interval (in milliseconds) between two successive queries.
- **startTime**: The start time for querying logs (in ISO 8601 format).
- **expr**: The query expression to filter logs. This is directly copied from the Graphana Explore code builder
- **cookie**: The authentication cookie obtained from the Grafana dashboard.

## Usage

1. **Clone the repository or copy the script to your local machine.**

2. **Cleanup**: Ensure that `state.json` is not present in the directory. This file contains saved work status to prevent re-fetching logs in case of connection problems or session expiration.

3. **Update the `config.json` file** with the appropriate values, especially the `cookie` field obtained from the Grafana dashboard.

4. **Run the script:**

   ```bash
   node index.js
   ```

### State Management

The script maintains a state file (`state.json`) to track the progress of log retrieval. This allows the script to resume from where it left off in case of any interruptions.

## Troubleshooting

- Ensure your `config.json` file is correctly formatted and contains valid values.
- Make sure the cookie is correctly copied from the Grafana dashboard.
- Check for any network-related issues if the script fails to fetch data.

## Note

- This script does not currently handle automatic rotation of authentication tokens if the session expires. Ensure your cookie is valid and update it if necessary.

## Contributions

Feel free to fork the repository and submit pull requests for any improvements or bug fixes.
