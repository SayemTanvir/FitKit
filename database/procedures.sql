CREATE OR REPLACE PROCEDURE register_member(
	IN p_name VARCHAR(100),
	IN p_email VARCHAR(100),
	IN p_password_hash VARCHAR(255),
	IN p_gender VARCHAR(10),
	IN p_birth_date DATE,
	IN p_height_cm NUMERIC(5,2),
	IN p_weight_kg NUMERIC(5,2),
	IN p_fitness_level VARCHAR(20),
	IN p_primary_goal VARCHAR(50),
	IN p_daily_step_goal INT,
	INOUT p_user_id INT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
	INSERT INTO users (
		name, email, password_hash, gender, birth_date,
		height_cm, weight_kg, fitness_level, primary_goal
	)
	VALUES (
		p_name, p_email, p_password_hash, p_gender, p_birth_date,
		p_height_cm, p_weight_kg, p_fitness_level, p_primary_goal
	)
	RETURNING user_id INTO p_user_id;

	INSERT INTO Member (user_id, daily_step_goal)
	VALUES (p_user_id, p_daily_step_goal);

	INSERT INTO MemberProfile (user_id, username)
	VALUES (p_user_id, 'member' || p_user_id);
END;
$$;
