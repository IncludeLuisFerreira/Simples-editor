import unicodedata

MAX_CODE_BYTES = 64 * 1024
MAX_STDIN_BYTES = 4 * 1024

ALLOWED_CATEGORIES = {
    'Ll',
    'Lu',
    'Lt',
    'Lm',
    'Lo',
    'Nd',
    'Nl',
    'No',
    'Pc',
    'Pd',
    'Ps',
    'Pe',
    'Pi',
    'Pf',
    'Po',
    'Sc',
    'Sm',
    'Sk',
    'So',
    'Zs',
    'Mn',
    'Mc',
    'Me',
}

CONTROL_ALLOWED = {'\t', '\n', '\r'}


def is_allowed_character(char: str) -> bool:
    if char in CONTROL_ALLOWED:
        return True
    cat = unicodedata.category(char)
    return cat in ALLOWED_CATEGORIES


def validate_code(code: str) -> str | None:
    if not code:
        return 'Code cannot be empty'

    try:
        code_bytes = code.encode('utf-8')
    except UnicodeEncodeError:
        return 'Code contains invalid UTF-8 characters'

    if len(code_bytes) > MAX_CODE_BYTES:
        return f'Code exceeds maximum size of {MAX_CODE_BYTES // 1024} KB'

    for i, char in enumerate(code):
        if not is_allowed_character(char):
            pos = len(code[:i].encode('utf-8'))
            return f'Code contains invalid character at byte position {pos}'

    return None


def validate_stdin(data: str) -> str | None:
    try:
        data_bytes = data.encode('utf-8')
    except UnicodeEncodeError:
        return 'Input contains invalid UTF-8 characters'

    if len(data_bytes) > MAX_STDIN_BYTES:
        return f'Input exceeds maximum size of {MAX_STDIN_BYTES // 1024} KB'

    return None
