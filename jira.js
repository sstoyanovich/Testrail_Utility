const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

(async () => {
  let { data } = await queryJira();
  let issues = data.issues;

  for (let i = data.maxResults; i < data.total; i += data.maxResults) {
    let { data: list } = await queryJira(i);
    issues = issues.concat(list.issues);
  }

  fs.writeFile(
    "./jira.json",
    JSON.stringify(issues.map((issue) => issue.key)),
    (err) => {
      if (err) {
        console.error(err);
      }
    }
  );

  // TODO: Create csv with jira ticket info
})();

async function queryJira(offset = 0) {
  return await axios.get(
    `https://wbdstreaming.atlassian.net/rest/api/3/search`,
    {
      auth: {
        username: process.env.JIRA_USERNAME,
        password: process.env.JIRA_API_KEY,
      },
      params: {
        jql: process.env.JIRA_FILTER,
        startAt: offset,
      },
    }
  );
}
