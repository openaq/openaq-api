let fetches = require('../test/data/fetches.json');

let buildSQLObject = function (f) {
  let obj = {
    time_started: f.timeStarted,
    time_ended: f.timeEnded,
    count: f.count,
    results: JSON.stringify(f.results)
  };

  return obj;
};

exports.seed = async function (knex, Promise) {
  // Clean up fetches table
  await knex('fetches').del();

  // Create array of inserts tasks
  let tasks = fetches.results.map(m => {
    let o = buildSQLObject(m);
    return knex('fetches').insert(o);
  });

  // Add deletion task first
  tasks.unshift(knex('fetches').del());

  // Handle all tasks
  return Promise.all(tasks);
};
