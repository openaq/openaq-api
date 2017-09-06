# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- In Latest endpoint, `distance` response field is added
  when `coordinates` filter is used.
### Deprecated
- In Locations endpoint, instead of the `nearest` option,
  use `order_by=distance` along with `limit`.

## [1.1.0] - 2017-08-12
### Added
- `order_by` and `sort` option for all endpoint fields.

### Changed
- `sort` option on the Measurements endpoint is now optional.

## [1.0.0]

Initial release.

### Added
- Read-only data endpoints for measurements, countries, cities,
  locations (stations), latest data, parameters (pollutants),
  and data sources.
- Upload and status endpoints.
