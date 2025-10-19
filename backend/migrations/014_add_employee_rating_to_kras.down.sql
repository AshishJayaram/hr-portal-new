-- Remove employee self-rating fields from KRAs table
ALTER TABLE kras DROP COLUMN employee_rating;
ALTER TABLE kras DROP COLUMN employee_rated_at;
ALTER TABLE kras DROP COLUMN employee_rated_by;

