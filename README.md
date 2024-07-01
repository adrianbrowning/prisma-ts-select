TODO

- [ ] Select all but `.selectAllOmit(["User.password"])`
- [ ] Join variants - left/right/cross/inner/full (where supported)
- [ ] `[*]join` vs `[*]joinUnsafe` 
- [ ] `joins` should only allow same type
- [ ] selectDistinct
- [ ] where ? is not NULL, remove null from union
- [x] having should only be allowed when groupBy has been called.

## select functions
### Aggregate
- [ ]  COUNT() |	Any |	Integer |	`SELECT COUNT(*) FROM users;`
- [ ]  SUM() |	Numeric |	Numeric |	`SELECT SUM(amount) FROM transactions;`
- [ ]  AVG() |	Numeric |	Numeric |	`SELECT AVG(score) FROM tests;`
- [ ]  MAX() |	Comparable (numeric, date, etc.) |	Same as input |	`SELECT MAX(salary) FROM employees;`
- [ ]  MIN() |	Comparable (numeric, date, etc.) |	Same as input |	`SELECT MIN(salary) FROM employees;`
  
### String
- [ ] CONCAT()	| Strings |	String |	`SELECT CONCAT(first_name, ' ', last_name) FROM users;`
- [ ] SUBSTRING()	| String, Integer, Integer |	String |	`SELECT SUBSTRING(name, 1, 3) FROM users;`
- [ ] REPLACE()	| String , String, String	| String |	`SELECT REPLACE(description, 'old', 'new') FROM items;`
- [ ] LENGTH()	| String |	Integer |	`SELECT LENGTH(username) FROM users;`
- [ ] UPPER()	| String |	String |	`SELECT UPPER(city) FROM addresses;`
- [ ] LOWER()	| String |	String |	`SELECT LOWER(city) FROM addresses;`

### Date and Time
- [ ] NOW() | None | DateTime | `SELECT NOW();`
- [ ] CURDATE() | None | Date | `SELECT CURDATE();`
- [ ] DATE_ADD() | Date, Interval | Date | `SELECT DATE_ADD(NOW(), INTERVAL 1 DAY);`
- [ ] DATE_SUB() | Date, Interval | Date | `SELECT DATE_SUB(NOW(), INTERVAL 1 DAY);`
- [ ] YEAR() | Date | Integer | `SELECT YEAR(birthdate) FROM users;`
- [ ] MONTH() | Date | Integer | `SELECT MONTH(birthdate) FROM users;`
- [ ] DAY() | Date | Integer | `SELECT DAY(birthdate) FROM users;`

### Mathematical
- [ ] ABS() | Numeric | Numeric | `SELECT ABS(-5);`
- [ ] CEIL() | Numeric | Numeric | `SELECT CEIL(4.2);`
- [ ] FLOOR() | Numeric | Numeric | `SELECT FLOOR(4.8);`
- [ ] ROUND() | Numeric, Integer (optional) | Numeric | `SELECT ROUND(4.567, 2);`
- [ ] POWER() | Numeric, Numeric | Numeric | `SELECT POWER(2, 3);`
- [ ] SQRT() | Numeric | Numeric | `SELECT SQRT(16);`

### Control Flow
- [ ] IF() | Condition, Value if True, Value if False | Depends on values | `SELECT IF(age > 18, 'Adult', 'Minor') FROM users;`
- [ ] CASE | Condition, Result, ELSE Result | Depends on values | `SELECT CASE WHEN age > 18 THEN 'Adult' ELSE 'Minor' END FROM users;`
- [ ] IFNULL() | Any, Any | Same as input | `SELECT IFNULL(middle_name, 'N/A') FROM users;`
- [ ] COALESCE() | Any, Any, ... | First non-null | `SELECT COALESCE(middle_name, first_name) FROM users;`

### JSON
- [ ] JSON_EXTRACT() | JSON, String | JSON Value | `SELECT JSON_EXTRACT(data, '$.name') FROM json_table;`
- [ ] JSON_ARRAY() | Any, ... | JSON Array | `SELECT JSON_ARRAY(1, 'two', 3) FROM dual;`
- [ ] JSON_OBJECT() | Pair of Strings (key, value) | JSON Object | `SELECT JSON_OBJECT('key1', 1, 'key2', 'value2') FROM dual;`
