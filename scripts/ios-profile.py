"""New signing-profile validation; no private profile contents are printed."""
import datetime
import hashlib
import os
import plistlib
import re
import sys
from pathlib import Path


def validate_profile(profile, team, bundle, method, now=None):
    now = now or datetime.datetime.now(datetime.timezone.utc)
    expiry = profile.get('ExpirationDate')
    if not isinstance(expiry, datetime.datetime):
        raise ValueError('Profile expiration date missing.')
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=datetime.timezone.utc)
    if expiry <= now:
        raise ValueError('Provisioning profile has expired.')
    entitlements = profile.get('Entitlements', {})
    if team not in profile.get('TeamIdentifier', []):
        raise ValueError('Profile does not belong to TEAM_ID.')
    prefixes = profile.get('ApplicationIdentifierPrefix', [])
    if not any(entitlements.get('application-identifier') == f'{prefix}.{bundle}' for prefix in prefixes):
        raise ValueError('Profile must match the exact BUNDLE_ID; wildcard profiles are not accepted.')
    if not profile.get('ProvisionedDevices') or profile.get('ProvisionsAllDevices'):
        raise ValueError('A development or Ad Hoc profile with registered test devices is required.')
    development = entitlements.get('get-task-allow') is True
    if method not in ('debugging', 'release-testing') or development != (method == 'debugging'):
        raise ValueError('Profile type does not match the selected export method.')
    uuid = profile.get('UUID', '')
    if not re.fullmatch(r'[A-Fa-f0-9-]{36}', uuid):
        raise ValueError('Invalid profile UUID.')
    certs = profile.get('DeveloperCertificates', [])
    if not certs or not all(isinstance(cert, bytes) for cert in certs):
        raise ValueError('Profile contains no signing certificates.')
    return uuid, [hashlib.sha1(cert).hexdigest().upper() for cert in certs]


if __name__ == '__main__':
    try:
        profile = plistlib.loads(Path(sys.argv[1]).read_bytes())
        uuid, fingerprints = validate_profile(profile, os.environ['TEAM_ID'], os.environ['BUNDLE_ID'], os.environ.get('EXPORT_METHOD', 'debugging'))
        identities = Path(sys.argv[2]).read_text()
        matching = next((fingerprint for fingerprint in fingerprints if re.search(r'\b' + fingerprint + r'\b', identities)), None)
        if not matching:
            raise ValueError('Imported private key/certificate does not match the provisioning profile.')
        Path(sys.argv[3]).write_text(uuid + '\n' + matching + '\n')
    except (ValueError, KeyError, IndexError) as error:
        sys.exit(str(error))
