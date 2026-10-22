from django.db import migrations


def retire_minor_laws(apps, schema_editor):
    # The Minor Laws page only repeated the five character pages it contains.
    apps.get_model('wiki', 'Article').objects.filter(slug='minor-laws').delete()


class Migration(migrations.Migration):
    dependencies = [('wiki', '0003_suggestion')]
    operations = [migrations.RunPython(retire_minor_laws, migrations.RunPython.noop)]
