"""New focused checks for the signing gate, runnable without Apple credentials."""
import copy
import datetime
import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('ios_profile', Path(__file__).with_name('ios-profile.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SigningProfileTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime.datetime(2026, 9, 20, tzinfo=datetime.timezone.utc)
        self.profile = {
            'UUID': '12345678-1234-1234-1234-123456789abc',
            'ExpirationDate': self.now + datetime.timedelta(days=30),
            'TeamIdentifier': ['TESTTEAM12'], 'ApplicationIdentifierPrefix': ['OLDPREFIX1'],
            'Entitlements': {'application-identifier': 'OLDPREFIX1.de.example.frontline', 'get-task-allow': True},
            'ProvisionedDevices': ['synthetic-test-device'], 'DeveloperCertificates': [b'synthetic-certificate'],
        }

    def check(self, profile, method='debugging'):
        return module.validate_profile(profile, 'TESTTEAM12', 'de.example.frontline', method, self.now)

    def test_development_and_adhoc_with_legacy_app_prefix(self):
        self.assertEqual(self.check(self.profile)[0], self.profile['UUID'])
        self.profile['Entitlements']['get-task-allow'] = False
        self.assertEqual(len(self.check(self.profile, 'release-testing')[1][0]), 40)

    def test_wrong_identity_expiry_and_distribution_are_rejected(self):
        changes = [
            {'TeamIdentifier': ['OTHERTEAM1']}, {'ExpirationDate': self.now},
            {'ProvisionedDevices': []}, {'ProvisionsAllDevices': True},
            {'DeveloperCertificates': []}, {'UUID': '../../unexpected'},
        ]
        for change in changes:
            with self.subTest(change=next(iter(change))):
                candidate = copy.deepcopy(self.profile); candidate.update(change)
                with self.assertRaises(ValueError): self.check(candidate)
        with self.assertRaises(ValueError): self.check(self.profile, 'release-testing')
        self.profile['Entitlements']['application-identifier'] = 'OLDPREFIX1.*'
        with self.assertRaises(ValueError): self.check(self.profile)

if __name__ == '__main__': unittest.main()
