import pytest
from pydantic import ValidationError
from app.schemas.user import UserCreateSchema


# --- Username validation ---


@pytest.mark.parametrize(
    "username",
    [
        pytest.param("alice", id="simple_lowercase"),
        pytest.param("Bob_42", id="mixed_case_underscore_digits"),
        pytest.param("a-b", id="with_hyphen_min_length"),
        pytest.param("a" * 30, id="max_length_30"),
    ],
)
def test_user_create_valid_username(username):
    user = UserCreateSchema(username=username, email="test@example.com", password="12345678")
    assert user.username == username


@pytest.mark.parametrize(
    "username",
    [
        pytest.param("ab", id="too_short_2_chars"),
        pytest.param("a" * 31, id="too_long_31_chars"),
        pytest.param("hello world", id="contains_space"),
        pytest.param("user@name", id="contains_at_sign"),
        pytest.param("user.name", id="contains_dot"),
        pytest.param("", id="empty_string"),
    ],
)
def test_user_create_invalid_username(username):
    with pytest.raises(ValidationError):
        UserCreateSchema(username=username, email="test@example.com", password="12345678")


# --- Email validation ---


@pytest.mark.parametrize(
    "email",
    [
        pytest.param("user@example.com", id="simple_email"),
        pytest.param("user.name@domain.org", id="dotted_local_part"),
        pytest.param("user@sub.domain.com", id="subdomain"),
    ],
)
def test_user_create_valid_email(email):
    user = UserCreateSchema(username="alice", email=email, password="12345678")
    assert user.email == email


@pytest.mark.parametrize(
    "email",
    [
        pytest.param("not-an-email", id="no_at_sign"),
        pytest.param("@domain.com", id="no_local_part"),
        pytest.param("user@", id="no_domain"),
        pytest.param("user@domain", id="no_tld"),
        pytest.param("", id="empty_string"),
    ],
)
def test_user_create_invalid_email(email):
    with pytest.raises(ValidationError):
        UserCreateSchema(username="alice", email=email, password="12345678")


# --- Password validation ---


def test_user_create_valid_password_min_length():
    user = UserCreateSchema(username="alice", email="test@example.com", password="12345678")
    assert user.password == "12345678"


def test_user_create_invalid_password_too_short():
    with pytest.raises(ValidationError):
        UserCreateSchema(username="alice", email="test@example.com", password="1234567")


def test_user_create_invalid_password_empty():
    with pytest.raises(ValidationError):
        UserCreateSchema(username="alice", email="test@example.com", password="")
