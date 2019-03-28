let sources = require('../test/data/sources.json');

let buildSQLObject = function (f) {
  let obj = {
    data: JSON.stringify(f)
  };

  return obj;
};

exports.seed = async function (knex, Promise) {
  // Clean up sources db
  await knex('sources').del();

  // Create array of inserts tasks
  let tasks = sources.results.map(m => {
    let o = buildSQLObject(m);
    return knex('sources').insert(o);
  });

  // Add deletion task first
  tasks.unshift(knex('sources').del());

  // Handle all tasks
  return Promise.all(tasks);
};
