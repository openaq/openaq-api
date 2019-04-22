exports.up = function (knex) {
  return knex.schema.createTable('locations', function (table) {
    table.string('id').primary();
    table.string('name');
    table.string('country');
    table.specificType('city', 'text ARRAY');
    table.specificType('location', 'text ARRAY');
    table.specificType('sourceName', 'text ARRAY');
    table.specificType('sourceType', 'text ARRAY');
    table.decimal('lon', null);
    table.decimal('lat', null);
    table.specificType('coordinates', 'GEOGRAPHY(Point, 4326)');
    table.dateTime('firstUpdated');
    table.dateTime('lastUpdated');
    table.specificType('parameters', 'text ARRAY');
    table.specificType('countsByMeasurement', 'json ARRAY');
    table.integer('count');
    table.index(['country', 'lon', 'lat']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('locations');
};
