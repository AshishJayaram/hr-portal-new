-- Add employee self-rating field to KRAs table
ALTER TABLE kras ADD COLUMN employee_rating REAL CHECK (employee_rating >= 1 AND employee_rating <= 5);
ALTER TABLE kras ADD COLUMN employee_rated_at DATETIME;
ALTER TABLE kras ADD COLUMN employee_rated_by INTEGER REFERENCES users(id);

