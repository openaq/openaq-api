exports.up = function (knex) {
  return knex.schema.createTable('locations', function (table) {
    table.string('id');
    table.string('name');
    table.string('country');
    table.string('city');
    table.string('location');
    table.decimal('lon', null);
    table.decimal('lat', null);
    table.specificType('coordinates', 'GEOGRAPHY(Point, 4326)');
    table.dateTime('firstUpdated');
    table.dateTime('lastUpdated');
    table.primary(['country', 'lon', 'lat']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('locations');
};
