const axios = require("axios");
const fs = require("fs");
require("dotenv").config();
const constants = require("./constants");
const jiraIDs = require("./jira.json");
const p0s = require("./p0.json");
const excludedIDs = require("./excludedIDs.json");

const project_id = "104";
const suite_id = "23470";
const regions = [constants.regions.core, constants.regions.us];

(async () => {
  // let { data } = await getPlans();
  // console.log(data);
  let tests = (await getAllTests()).map((arr) => arr.data.cases).flat();
  tests = filterTests(tests); // removing any tests outside the region and platform

  // // removing any test cases that we specifically want to exclude
  excludedIDs.forEach((excluded) => {
    let index = tests.indexOf(excluded);
    if (index > -1) {
      tests.splice(tests.indexOf(excluded), 1);
    }
  });
  console.log("tests added (including dups): " + tests.length);
  createCSV(tests);
  // await createTestPlan(tests.map((test) => test.id));
})();

function createCSV(tests) {
  let str = "";
  tests.forEach((test) => {
    str += `${test.id}; ${test.title}; ${test.priority_id}; ${test.refs}\n`;
  });

  fs.writeFile("./cases.csv", str, (err) => {
    if (err) {
      console.error(err);
    }
  });
}

function filterTests(tests) {
  return tests.filter(removeExtras);
}

function removeExtras(test) {
  return (
    test.custom_region.some((region) => regions.includes(region)) &&
    test.custom_applicable_platfroms.includes(
      constants.platforms[process.env.PLATFORM]
    )
  );
}

async function getAllTests() {
  const promises = [];
  for (const id of jiraIDs.concat(p0s)) {
    promises.push(getTestCasesFromJiraId(id));
  }
  return await Promise.all(promises);
}

async function getTestCasesFromJiraId(id) {
  return await axios.get(
    `https://discovery.testrail.io/index.php?/api/v2/get_cases/${project_id}&suite_id=${suite_id}`,
    {
      auth: {
        username: process.env.TEST_RAIL_USERNAME,
        password: process.env.TEST_RAIL_API_KEY,
      },
      params: {
        priority_id: [
          // constants.priorities.p2,
          constants.priorities.p1,
          // constants.priorities.p0,
        ],
        refs: id,
        type_id: [constants.testTypes.regression],
      },
    }
  );
}

async function createTestPlan(cases) {
  axios.post(
    "https://discovery.testrail.io/index.php?/api/v2/add_plan/104",
    {
      name: process.env.RUN_NAME,
      entries: [
        {
          suite_id: suite_id,
          name: process.env.ENTRY_NAME,
          include_all: false,
          case_ids: cases,
        },
      ],
    },
    {
      auth: {
        username: process.env.TEST_RAIL_USERNAME,
        password: process.env.TEST_RAIL_API_KEY,
      },
    }
  );
}

async function getPlans() {
  return await axios.get(
    `https://discovery.testrail.io/index.php?/api/v2/get_tests/99014`,
    {
      auth: {
        username: process.env.TEST_RAIL_USERNAME,
        password: process.env.TEST_RAIL_API_KEY,
      },
    }
  );
}

// WIP API instructions aren't super clear on how to get entry id
async function updateTestPlanEntries(cases) {
  axios.post(
    "https://discovery.testrail.io/index.php?/api/v2/update_run_in_plan_entry/98296",
    {
      include_all: false,
      case_ids: cases,
    },
    {
      auth: {
        username: process.env.TEST_RAIL_USERNAME,
        password: process.env.TEST_RAIL_API_KEY,
      },
    }
  );
}
