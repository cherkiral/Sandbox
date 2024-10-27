import json

import requests
import base64
from sqlalchemy.orm import Session
from app.twitter import crud, models

SANDBOX_HEADERS = {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "origin": "https://www.sandbox.game",
    "referer": "https://www.sandbox.game/",
    "sec-ch-ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "Windows",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
}


def get_proxy_for_account(db: Session, account_id: int):
    account = crud.get_twitter_account_by_id(db, account_id)
    return account.proxy if account and account.proxy else None


def get_csrf_token(session, twitter_account, proxy=None):
    session.cookies.set("auth_token", twitter_account)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 YaBrowser/24.7.0.0 Safari/537.36",
    }

    proxies = {"http": proxy, "https": proxy} if proxy else None

    response = session.get("https://x.com/home", headers=headers, proxies=proxies)

    if response.status_code != 200:
        raise Exception(f"Failed to retrieve CSRF token: {response.content}")

    csrf_token = session.cookies.get("ct0")
    if not csrf_token:
        raise Exception("Failed to retrieve CSRF token")

    return csrf_token


def create_tweet(twitter_account, text, proxy=None):
    session = requests.Session()

    csrf_token = get_csrf_token(session, twitter_account, proxy=proxy)

    headers = {
        "accept": "*/*",
        "accept-language": "ru,en;q=0.9",
        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        "content-type": "application/json",
        "cookie": f"auth_token={twitter_account}; ct0={csrf_token}",
        "origin": "https://x.com",
        "priority": "u=1, i",
        "referer": "https://x.com/home",
        "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "YaBrowser";v="24.7", "Yowser";v="2.5"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "Windows",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 YaBrowser/24.7.0.0 Safari/537.36",
        "x-client-transaction-id": "ppacC10z5PNCx6UGVyE4ewdOxERdZvB0kgTukF5K6oey5H+z/mzz0pBPO2dWb7PKjZhAYqTvZ7+mRICcix8bPxngtIVypQ",
        "x-client-uuid": "2900ce91-2caa-4a58-a2da-28c318035dd0",
        "x-csrf-token": csrf_token,
        "x-twitter-active-user": "yes",
        "x-twitter-auth-type": "OAuth2Session",
        "x-twitter-client-language": "en",
    }

    data = {
        "variables": {
            "tweet_text": text,
            "dark_request": False,
            "media": {
                "media_entities": [],
                "possibly_sensitive": False
            },
            "semantic_annotation_ids": [],
            "disallowed_reply_options": None
        },
        "features": {
            "communities_web_enable_tweet_community_results_fetch": True,
            "c9s_tweet_anatomy_moderator_badge_enabled": True,
            "responsive_web_edit_tweet_api_enabled": True,
            "graphql_is_translatable_rweb_tweet_is_translatable_enabled": True,
            "view_counts_everywhere_api_enabled": True,
            "longform_notetweets_consumption_enabled": True,
            "responsive_web_twitter_article_tweet_consumption_enabled": True,
            "tweet_awards_web_tipping_enabled": False,
            "creator_subscriptions_quote_tweet_preview_enabled": False,
            "longform_notetweets_rich_text_read_enabled": True,
            "longform_notetweets_inline_media_enabled": True,
            "articles_preview_enabled": True,
            "rweb_video_timestamps_enabled": True,
            "rweb_tipjar_consumption_enabled": True,
            "responsive_web_graphql_exclude_directive_enabled": True,
            "verified_phone_label_enabled": False,
            "freedom_of_speech_not_reach_fetch_enabled": True,
            "standardized_nudges_misinfo": True,
            "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": True,
            "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
            "responsive_web_graphql_timeline_navigation_enabled": True,
            "responsive_web_enhance_cards_enabled": False
        },
        "queryId": "znq7jUAqRjmPj7IszLem5Q"
    }

    proxies = {"http": proxy, "https": proxy} if proxy else None

    response = session.post("https://x.com/i/api/graphql/znq7jUAqRjmPj7IszLem5Q/CreateTweet", headers=headers,
                            json=data, proxies=proxies)

    if response.status_code != 200:
        raise Exception(f"Failed to post tweet: {response.content}")

    return response.json()


def login_to_sandbox(username, password, db: Session, account_id: int, proxy=None):
    login_url = "https://api.sandbox.game/auth/login"
    auth_data = base64.b64encode(bytes(f"{username}:{password}", "utf-8")).decode("ascii")

    headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        'authorization': f'Basic {auth_data}',
        "cache-control": "no-cache",
        "content-type": "application/json",
        "origin": "https://www.sandbox.game",
        "priority": "u=1, i",
        "referer": "https://www.sandbox.game/",
        "sec-ch-ua": '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        "x-csrf-token": ""
    }

    cookies = {
        "_gcl_au": "1.1.213215220.1729221095",
        "_ga": "GA1.1.1444689873.1729221104",
        "singular_device_id": "678c1991-4f9b-4031-a5cc-c08b5f297db4",
        "_gsid": "1c64cffd08b4497fa327ecedbf6b091e",
        "_tt_enable_cookie": "1",
        "_ttp": "ABjEw3BvKbVY73x4eHXMixykryS",
        "_fbp": "fb.1.1729222571560.97305942727166373",
        "_hjSessionUser_2924073": "eyJpZCI6IjE3MzVkZjIwLWY0YmItNWYwNi04ODM4LWU0ZDVmNWFkMWQyNiIsImNyZWF0ZWQiOjE3MjkyMjExMjY2MjEsImV4aXN0aW5nIjp0cnVlfQ==",
        "__cf_bm": "62eXNU9VcF5y6cdUI..Lx49DIvZn9B.P8wopuOXyb9g-1729464390-1.0.1.1-XpqdU_E_pkpJchXf4jQUkhC.PSuFIRo1xi3SHVcod6xb48ECjx1U2yJ8frjA.nfvb6xzJHczDFQ1r2uT3gSPNA",
        "_cfuvid": "7xDgKC_8YL2FuqoH6f5IYXWKzDZnM9VOspsFf7S41QQ-1729464390462-0.0.1.1-604800000",
        "cf_clearance": "uhjb2wNOsZEhxSIAuzjFQ98vH.Rwtkepb6Clw5G0rFg-1729464391-1.2.1.1-NDL_mfpztyj168yK_3UeBAJp2LSvU9Ged68VjyXzdgz_VFVJmxr0uuLyaz2cMlv__rdrtcCHhhbT4Nd.Rq6Dkb9lke.6lpZ41UANZVVk4OG6OVmrIXFKYd_v2ZVOCBG8DTaY0oeUPKYXnNX1jHJn.JIruACcaVUjc4PebEkeagVub4ICQ1jwNduNSP.7pTGFKdOWDUuXTdIMki9LPP6Eeb.OfjBgCGL9roWsJY9PUr2QQgKBnal9Z9RZZRBpWm6GvNnP5kTuWYP4QYEGMOvfQHI2IzicBlw4IlKzKXodikMQ499pCdT3z7TIGAouWsesEeoBe3mxDc7ve9QxDWsztBY800XAa4ZdEnV94gZF58zb3GJK7xyVUxkL_cPA5jb6",
        "ab.storage.sessionId.7e595e9d-fabc-486f-b6f3-33fd04beb5bc": "%7B%22g%22%3A%22846105b4-f252-7534-3d8d-229702478d9b%22%2C%22e%22%3A1729466191898%2C%22c%22%3A1729464391898%2C%22l%22%3A1729464391898%7D",
        "ab.storage.deviceId.7e595e9d-fabc-486f-b6f3-33fd04beb5bc": "%7B%22g%22%3A%222dab8aef-7192-2d55-7632-ee547a4614fb%22%2C%22c%22%3A1729222568962%2C%22l%22%3A1729464391898%7D",
        "ab.storage.userId.7e595e9d-fabc-486f-b6f3-33fd04beb5bc": "%7B%22g%22%3A%22f74ced04-882f-43fe-8610-5055b366429f%22%2C%22c%22%3A1729222568959%2C%22l%22%3A1729464391899%7D",
        "f_id": "40e240a2b8542ad91f2149299d2e5f41",
        "_rdt_uuid": "1729221122418.31753add-0ce9-4f56-ad6a-3015e94d3a9c",
        "_hjSession_2924073": "eyJpZCI6IjFkNzNlZWM3LWQ1NzktNGE0Ny05Y2VhLWRjYzk0NWQ5MGEwNyIsImMiOjE3Mjk0NjQzOTM1NjYsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjowLCJzcCI6MH0=",
        "_uetsid": "d0014f508dd411ef9cbf71d9c4626e04",
        "_uetvid": "bff7b7308cfe11ef8eb48bb3e986ca0b",
        "mp_18a0785d4d57ed4ba7a9fa3dbc30af74_mixpanel": "%7B%22distinct_id%22%3A%20%22%24device%3A192ac1f6e5432b71-0b29dd1c619c0f-26001051-384000-192ac1f6e5432b71%22%2C%22%24device_id%22%3A%20%22192ac1f6e5432b71-0b29dd1c619c0f-26001051-384000-192ac1f6e5432b71%22%2C%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%2C%22__timers%22%3A%20%7B%22dsb_pageSession%22%3A%201729464596341%7D%7D",
        "_ga_R0TLSXCC02": "GS1.1.1729464391.6.1.1729464597.58.0.834314628"
    }

    session = requests.Session()

    proxies = {"http": proxy, "https": proxy} if proxy else None

    response = session.post(login_url, headers=headers, cookies=cookies, proxies=proxies)

    if response.status_code == 200:
        print("Login successful.")
        session_cookies = session.cookies.get_dict()

        # Store session in the database
        crud.update_sandbox_session(db, account_id, json.dumps(session_cookies))
        return session
    else:
        print(f"Login failed: {response.content}")
        return None


def get_session_from_db(db: Session, account_id: int):
    """
    Retrieves the saved session from the database for a specific account.
    """
    account = crud.get_twitter_account_by_id(db, account_id)
    if account and account.session_data:
        return json.loads(account.session_data)
    return None


def send_confirm_request(session, proxy=None):
    url = "https://api.sandbox.game/social-challenges/twitter-web-intent"

    headers = SANDBOX_HEADERS

    proxies = {"http": proxy, "https": proxy} if proxy else None

    response = session.post(url, headers=headers, proxies=proxies)

    if response.status_code == 200:
        if 'error' not in response.json():
            return response.json()['_id']
        else:
            return None
    else:
        return None


def find_event_status(events, challenge_id):
    for event in events:
        print(f"Checking event: {event['_id']}")
        if event['_id'] == challenge_id:
            return event['status']
    return None


def check_confirm_status(session, challenge_id, proxy=None):
    url = "https://api.sandbox.game/social-challenges/list?type=TWITTER&mapChallengeInfo=true"

    headers = SANDBOX_HEADERS

    proxies = {"http": proxy, "https": proxy} if proxy else None

    response = session.get(url, headers=headers, proxies=proxies)

    if response.status_code == 200:
        status = find_event_status(response.json(), challenge_id)
        return status
    else:
        return f"Request failed: {response.content}"


def get_total_ep(session, proxy=None):
    url = "https://api.sandbox.game/social-events/season-event/ep-sources/user"

    headers = SANDBOX_HEADERS

    proxies = {"http": proxy, "https": proxy} if proxy else None

    response = session.get(url, headers=headers, proxies=proxies)

    if response.status_code == 200:
        status = response.json()['total']
        return status
    else:
        return f"Request failed: {response.content}"


def get_user_verification(session, proxy=None):
    url = "https://api.sandbox.game/user-verifications"

    headers = SANDBOX_HEADERS

    proxies = {"http": proxy, "https": proxy} if proxy else None

    response = session.get(url, headers=headers, proxies=proxies)

    if response.status_code == 200:
        status = response.json()['status']
        return status
    else:
        return f"Request failed: {response.content}"


def get_alphapass_ownership(session, proxy=None):
    url = "https://api.sandbox.game/social-events/426/progress-data"

    headers = SANDBOX_HEADERS

    proxies = {"http": proxy, "https": proxy} if proxy else None

    response = session.get(url, headers=headers, proxies=proxies)

    if response.status_code == 200:
        status = response.json()['gatingOwnership']
        return status
    else:
        return f"Request failed: {response.content}"
