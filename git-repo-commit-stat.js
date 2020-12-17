const { ORGANISATION_REPOS_URL, GITHUB_TOKEN } = process.env;
const PULL_REQUEST_URL = "https://api.github.com/repos";

const fetch = require("node-fetch");
const parse = require("parse-link-header");

const getAllRepos = async (url = ORGANISATION_REPOS_URL, responses = {}) => {
  console.log(`Fetching repositories for organization: ${url}`);
  const response = await fetch(url, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
  });
  const link = parse(response.headers.get("link"));

  if (link && link.next) {
    responses[url] = await response.json();
    responses = await getAllRepos(link.next.url, responses);
  } else {
    responses[url] = await response.json();
  }
  return responses;
};

const getAllPRs = async (url, responses = {}) => {
  console.log(`Fetching closed PRs for ${url}`);
  const response = await fetch(url, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
  });
  const link = parse(response.headers.get("link"));

  if (link && link.next) {
    responses[url] = await response.json();
    responses = await getAllPRs(link.next.url, responses);
  } else {
    responses[url] = await response.json();
  }
  return responses;
};

const createCSV = (obj) => {
  const getSprint = (pr, sprint = 1) => {
    const fortnight = 12096e5;
    const fortnightBefore = new Date(Date.now() - 12096e5 * sprint);
    const fortnightAway = new Date(Date.now() + 12096e5 * sprint);

    if (
      new Date(pr.merged_at) > fortnightBefore &&
      new Date(pr.merged_at) < fortnightAway
    ) {
      return sprint;
    } else {
      return getSprint(pr, sprint + 1);
    }
  };

  const csvData = obj
    .filter((pr) => pr.merged_at)
    .map((pr) => {
      return {
        id: pr.id,
        url: pr.html_url,
        state: pr.state,
        title: pr.title,
        user: pr.user.login,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        closed_at: pr.closed_at,
        merged_at: pr.merged_at,
      };
    })
    .sort(function (a, b) {
      return new Date(a.merged_at) - new Date(b.merged_at);
    })
    .map((pr) => {
      const sprint = getSprint(pr);
      return {
        sprint,
        ...pr,
      };
    });

  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const date = new Date();

  const month =
    date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;

  const day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate();

  const hour = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
  const minutes =
    date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
  const seconds =
    date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds();

  const dFormat = `${date.getFullYear()}-${month}-${day}-${hour}-${minutes}-${seconds}`;
  const fileName = `closed-prs-${dFormat}.csv`;
  const csvWriter = createCsvWriter({
    path: fileName,
    header: [
      { id: "sprint", title: "Sprint" },
      { id: "id", title: "ID" },
      { id: "url", title: "URL" },
      { id: "state", title: "State" },
      { id: "title", title: "Title" },
      { id: "user", title: "User" },
      { id: "created_at", title: "Created at" },
      { id: "updated_at", title: "Updated at" },
      { id: "closed_at", title: "Closed at" },
      { id: "merged_at", title: "Merged at" },
    ],
  });

  csvWriter.writeRecords(csvData).then(() => {
    console.log(`Wrote: ${fileName}`);
  });
};

// Async startup init
const init = new Promise((resolve, reject) => {
  getAllRepos()
    .then(async (repos) => {
      let allRepos = [];
      Object.keys(repos).forEach((key) => {
        allRepos = allRepos.concat(repos[key]);
      });

      // Filter out forks
      const noForkRepos = allRepos.filter((repo) => !repo.fork);

      console.log(`\nFound ${noForkRepos.length} repositories in organisation`);

      const results = [];
      for (const noForkRepo of noForkRepos) {
        const url = `${PULL_REQUEST_URL}/${noForkRepo.full_name}/pulls?state=closed`;
        const result = await getAllPRs(url);
        results.push(result);
      }
      let prArray = [];
      Object.keys(results).map((key) => {
        Object.keys(results[key]).map((innerKey) => {
          prArray = prArray.concat(results[key][innerKey]);
        });
      });
      console.log(
        `Found ${prArray.length} closed PRs for all repositories in organisation`
      );
      createCSV(prArray);
    })
    .catch((error) => {
      reject(error);
    });
});

init.then((results) => {
  let prArray = [];
  Object.keys(results).map((key) => {
    prArray = prArray.concat(results[key]);
  });
});
