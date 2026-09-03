-- FitKit SQL functions/procedures

-- 1. Validate User Age (> 15 Years Old)
CREATE OR REPLACE FUNCTION validate_user_age()
RETURNS TRIGGER AS $$
BEGIN
    IF EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.birth_date)) < 16 THEN
        RAISE EXCEPTION 'FitKit users must be older than 15 years.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Resolve Member Rank Dynamically based on Account Age (Tenure)
CREATE OR REPLACE FUNCTION get_membership_rank(
    p_user_id INT
)
RETURNS VARCHAR(30) AS $$
DECLARE
    v_rank VARCHAR(30);
BEGIN
    SELECT mr.rank_name
    INTO v_rank
    FROM users u
    JOIN MembershipRank mr
        ON EXTRACT(
            YEAR FROM AGE(CURRENT_DATE, u.created_at::DATE)
        ) >= mr.min_years
    WHERE u.user_id = p_user_id
    ORDER BY mr.min_years DESC
    LIMIT 1;

    IF v_rank IS NULL THEN
        RAISE EXCEPTION 'User with ID % not found.', p_user_id;
    END IF;

    RETURN v_rank;
END;
$$ LANGUAGE plpgsql;

-- 3. Dynamic Water Goal Calculation
-- Target (mL) = (weight * 35) + ((height - 170) * 5) - ((age - 30) * 5)
CREATE OR REPLACE FUNCTION calculate_water_goal(
    p_user_id INT
)
RETURNS INT AS $$
DECLARE
    v_age INT;
    v_height NUMERIC;
    v_weight NUMERIC;
    v_water NUMERIC;
BEGIN
    SELECT
        EXTRACT(
            YEAR FROM AGE(CURRENT_DATE, u.birth_date)
        )::INT,
        u.height_cm,
        u.weight_kg
    INTO
        v_age,
        v_height,
        v_weight
    FROM users u
    WHERE u.user_id = p_user_id;

    IF v_age IS NULL THEN
        RAISE EXCEPTION 'User with ID % not found.', p_user_id;
    END IF;

    v_water := (v_weight * 35) + ((v_height - 170) * 5) - ((v_age - 30) * 5);

    IF v_water < 1000 THEN
        v_water := 1000;
    END IF;

    RETURN ROUND(v_water)::INT;
END;
$$ LANGUAGE plpgsql;