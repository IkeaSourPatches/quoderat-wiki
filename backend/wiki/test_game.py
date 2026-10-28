import json

from django.test import Client, TestCase

from .game import PUZZLES, valid_solution


def solve(puzzle):
    neighbours = {r['id']: set() for r in puzzle['regions']}
    for edge in puzzle['borders']:
        a, b = edge['regions']
        neighbours[a].add(b)
        neighbours[b].add(a)
    colours = [-1] * len(neighbours)
    order = sorted(neighbours, key=lambda r: -len(neighbours[r]))

    def visit(i):
        if i == len(order):
            return True
        region = order[i]
        for colour in range(4):
            if all(colours[n] != colour for n in neighbours[region]):
                colours[region] = colour
                if visit(i + 1):
                    return True
        colours[region] = -1
        return False

    assert visit(0), puzzle['id']
    return colours


class GameTests(TestCase):
    def test_all_maps_have_valid_geometry_and_solution(self):
        self.assertEqual(len(PUZZLES), 9)
        for puzzle in PUZZLES:
            edges = {}
            for r in puzzle['regions']:
                points = r['points']
                for a, b in zip(points, points[1:] + points[:1]):
                    edges.setdefault(tuple(sorted((tuple(a), tuple(b)))), []).append(r['id'])
            self.assertTrue(all(len(ids) <= 2 for ids in edges.values()))
            expected = {tuple(sorted(ids)) for ids in edges.values() if len(ids) == 2}
            self.assertEqual(expected, {tuple(sorted(e['regions'])) for e in puzzle['borders']})
            self.assertTrue(valid_solution(puzzle, solve(puzzle)))
            bad = solve(puzzle)
            a, b = puzzle['borders'][0]['regions']
            bad[b] = bad[a]
            self.assertFalse(valid_solution(puzzle, bad))

    def test_validation_rejects_bad_values(self):
        puzzle = PUZZLES[0]
        for colours in [None, [], [-1, -1], [True, False], [0, 4], ['0', 1], {}, [0.0, 1]]:
            self.assertFalse(valid_solution(puzzle, colours))

    def test_api_and_csrf(self):
        client = Client(enforce_csrf_checks=True)
        url = '/api/game/validate/'
        data = {'id': PUZZLES[0]['id'], 'colours': solve(PUZZLES[0])}
        self.assertEqual(client.post(url, json.dumps(data), content_type='application/json').status_code, 403)
        token = client.get(url).json()['csrfToken']
        response = client.post(url, json.dumps(data), content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.json(), {'valid': True})
        for payload, status in [
            ('[]', 400),
            ('not json', 400),
            (json.dumps({'id': 'missing'}), 404),
            ('x' * 4097, 400),
        ]:
            self.assertEqual(
                client.post(url, payload, content_type='application/json', HTTP_X_CSRFTOKEN=token).status_code, status
            )
        daily = client.get('/api/game/daily/').json()
        self.assertIn(daily['id'], [p['id'] for p in PUZZLES])
        self.assertEqual(len(client.get('/api/game/puzzles/').json()), 9)
