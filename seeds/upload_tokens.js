exports.seed = function (knex, Promise) {
  // Insert one token that equals 'foo' with encryption key of 'not_secure'
  let tasks = [
    knex('upload_tokens').insert({token: '690868'})
  ];

  // Add deletion task first
  tasks.unshift(knex('upload_tokens').del());

  // Handle all tasks
  return Promise.all(tasks);
};
