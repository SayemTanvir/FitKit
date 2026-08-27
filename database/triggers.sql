-- FitKit database triggers
-- Example target: automatically award badges when activity milestones are reached.

-- 8. FUNCTIONS, TRIGGERS & SEED DATA
 

-- User Age Guard (> 15 Years Old)
CREATE OR REPLACE FUNCTION validate_user_age()
RETURNS TRIGGER AS $$
BEGIN
    IF EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.birth_date)) < 16 THEN
        RAISE EXCEPTION 'FitKit users must be older than 15 years.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_user_age
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION validate_user_age();

-- Seed Membership Ranks
INSERT INTO MembershipRank (rank_name, min_years)
VALUES
    ('Bronze', 0),
    ('Silver', 1),
    ('Gold', 3),
    ('Platinum', 5),
    ('Diamond', 10);

-- Resolve Member Rank based on Account Age
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
        RAISE EXCEPTION 'User not found.';
    END IF;

    RETURN v_rank;
END;
$$ LANGUAGE plpgsql;

-- Dynamic Water Goal Calculation
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
        RAISE EXCEPTION 'User not found.';
    END IF;

    v_water := (v_weight * 35) + ((v_height - 170) * 5) - ((v_age - 30) * 5);

    IF v_water < 1000 THEN
        v_water := 1000;
    END IF;

    RETURN ROUND(v_water)::INT;
END;
$$ LANGUAGE plpgsql;