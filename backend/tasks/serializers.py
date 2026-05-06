from rest_framework import serializers
from django.utils import timezone
from .models import Task
from users.serializers import UserSerializer


class TaskSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    created_by = UserSerializer(read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'due_date', 'priority', 'status',
            'project', 'assigned_to', 'assigned_to_id', 'created_by',
            'is_overdue', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'project']

    def get_is_overdue(self, obj):
        if obj.due_date and obj.status != 'done':
            return obj.due_date < timezone.now().date()
        return False
