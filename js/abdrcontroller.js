'use strict';

/* App Module */
var abdrcoderApp = angular.module('abdrcoderApp', [

]);

/* 不用默认标签，避免和django模版标签冲突 */
abdrcoderApp.config(function($interpolateProvider) {
	$interpolateProvider.startSymbol('[[');
	$interpolateProvider.endSymbol(']]');
});



function tableCtrl ($scope) {
	
	$scope.save = function(){

		if (!$scope.my.name   ) {
			alert("要输字段名");
			return;
		}
		//判断类型的精确度
		var type=$scope.my.type;
		if(type=="CharField"){
			if(!$scope.my.max_length){
				alert("长度不能为空");
				return;
			}
		}else if(type=="DecimalField"){
			if(!$scope.my.dig_max){
				alert("精度整数位不能为空");
				return;
			}
			if(!$scope.my.dig_dec){
				alert("精度小数位不能为空");
				return;
			}
			
		}else if(type=="BooleanField"){
			
		}
		
		if($.inArray($scope.my,$scope.fields)==-1){
			//找不到，是新增
			if( hasname($scope.my.name)   ){
				alert("字段名重复了");
				return;
			}
			$scope.add();
		}else{
			$scope.mdf();
		}
	}
	
	$scope.add = function() {		
		var data = $scope.my ;
		$scope.fields.push(data);
		resetmy();
	}
	
	$scope.mdf = function() {
		//var data = $scope.my ;
		//$scope.fields.splice($.inArray(data,$scope.fields),1);
		//$scope.fields.push(data);
		resetmy();
	}
	
	$scope.del = function(item) {	
		$scope.fields.splice($.inArray(item,$scope.fields),1);
	}

	$scope.open=function(item){
		$scope.my = item;   //深复制 jQuery.extend(true, {}, item); 
	}
		
	//监测名字是否重复
	function hasname(name ){
		
		for( var i=0;i<$scope.fields.length;i++ ){		 
			if (name==  $scope.fields[i].name){
				return true;
			}
		}
		return false;
	}
	//重置my区域
	function resetmy(){
		$scope.my={};
		$scope.my.type="CharField";
		$scope.my.nullable=true;
		$scope.my.isunique=false;
		$("#max_length").show();
	}
	function init() {
		
		$scope.fields=[]
		/*测试数据
		[
			{"name": "Nexus S",
			  "max_length":1,
			 "age": 0},
			{"name": "Nexus S",
			  "max_length":2,
			 "age": 0}
		  ];
		 */
		 
		 resetmy();
		 $scope.tablename="";
		 $scope.appname="tifen";
	}

	
	//导出json格式
	$scope.export2=function(){		 
		if( !$scope.appname  || !$scope.tablename){
			alert("输入应用名和表名！");
			return ;
		}
		var outputdata={ appname:$scope.appname ,"tablename":$scope.tablename, fields:$scope.fields }
		doSave( $.toJSON( outputdata ) , "txtext/latex", $scope.appname+"_"+$scope.tablename+".txt"); 
	}	
	
	//导入
	$scope.import2=function(){
		var result= document.getElementById("showresult").value;
		if(!$.trim(result)){
		   alert("格式不正确");
		}
		var data=$.parseJSON(result);
		if(!data.appname || !data.tablename || !data.fields ){
			alert("格式不正确");
		}else{
			$scope.appname=data.appname;
			$scope.tablename=data.tablename;
			$scope.fields= data.fields;			
		}			
	}
	
	$scope.generalcoe=function(){
		//变量声明
		//用于urls.py，services.js的 url
		var modelUrl=("/"+$scope.appname+"/api/"+$scope.tablename+"/").toLowerCase();
		
		
		
		if( !$scope.appname  || !$scope.tablename){
			alert("输入应用名和表名！表名建议大写首字母");
			return ;
		}
		
		if($scope.fields.length==0){
			alert("还没有添加字段！");
			return ;
		}
		var firstName="";
		//model
		var code = ["",
		"# -*- coding: utf-8 -*-",
		"from django.db import models",
		"",
		"class "+$scope.tablename+"(models.Model):"]
		for( var i=0;i<$scope.fields.length;i++ ){		 
			var f=$scope.fields[i];
			if(i==0)
				firstName=f.name;
			
			var codeline="    "+f.name+"=models."+ f.type+"( ";
//			+f.common+"', "
			
			//第一个参数：
			//如果是外键的情况要求第一个参数是模型的类，所以需要使用verbose_name关键字参数
			//其他情况，默认第一个无名参数是别名,如果没有无名参数，则会把属性名作为别名
			if( f.type=='ForeignKey' ||  f.type=='ManyToManyField' || f.type=='OneToOneField' ){
				codeline+= f.ftablename+", verbose_name=\""+f.common+"\"";
			}
			else {
				if(f.common){
					codeline+="'"+f.common+"'";
				}
				else{
					codeline+="'"+f.name.replace("_"," ") +"'";
				}
			}
			
			if( f.type=='CharField' ){
				codeline+=", max_length="+f.max_length;
			}else if (f.type=='BooleanField'){
				codeline+=", default="+f.true_false;
			}else if(f.type=='DecimalField'){
				codeline+=" , max_digits="+f.dig_max+", decimal_places="+f.dig_dec;
			}			
			
			if(f.primary_key){
					codeline+=", primary_key=True";
			}
			else{
					var isuniqur="";
					if(f.isunique)
						isuniqur="True";
					else
						isuniqur="False";
			
					var nullable="";
					var blank="";
					if(f.nullable){
						nullable="True";
						blank="True"; //此属性影响django界面是否可以为空
					}
					else{
						nullable="False";
						blank="False";
					}
					codeline+=", unique="+ isuniqur +", null="+nullable+",blank="+blank ;
			}
			if(f.default){
				codeline+=",default="+f.default ;
			}	
			
			codeline+=")";
			code.push(codeline);
		}
		$scope.txtmodels=code.join('\n');
		
		//views
		var views = ["",
		    		"###############以下是api.py的代码",
					"#coding=utf-8",
		    		"from rest_framework import generics, viewsets",
					"from rest_framework.response import Response",
					"from .models import *",
					"from .permissions import *",
					"from .serializers import *",
		    		"",
		    		"class "+$scope.tablename+"ViewSet(viewsets.ModelViewSet):",
		    		"    queryset = "+$scope.tablename+".objects.all()",
					"    permission_classes = ("+$scope.tablename+"CRUD,)",
		    		"    serializer_class = "+$scope.tablename+"Serializer",
					"    def list(self, request):",
					"        return Response('query please call *list api')",
		    		"",
					"class "+$scope.tablename+"List(generics.ListAPIView):",
					"    permission_classes = ("+$scope.tablename+"Q,)",
					"    serializer_class = "+$scope.tablename+"Serializer",
					"    def get_queryset(self):",
					"        id   = self.request.QUERY_PARAMS.get('id', None)",
					"        id2  = self.kwargs.get('id2', None)",	
					"        queryset =  "+$scope.tablename+".objects.all()",
 					"        if id is not None:",          
 					"            queryset = queryset.filter(id=id)",
 					"        if id2 is not None:",          
 					"            queryset = queryset.filter(id=id2)",
    				"        return queryset ",
					"###############以下是permissions.py的代码",
					"#encoding:utf-8",
					"#用于rest框架的权限控制",
					"from rest_framework import permissions",
					"from models import *",
					"",
					"'''管理查询权限'''",    
					"class "+$scope.tablename+"Q(permissions.BasePermission):",
					"    def has_permission(self, request, view):",
					"        if request.method in permissions.SAFE_METHODS and "+$scope.tablename+".objects.filter(user_id = request.user.id,pk =view.kwargs.get('pk') ).exists():",
 					"           return True",
 					"        else :",
    				"           return False",
					"'''管理增删改权限'''",     
					"class "+$scope.tablename+"CRUD(permissions.BasePermission):",
					"    def has_object_permission(self, request, view, obj):",
					"        #此人属于此团队的管理员",
					"        if "+$scope.tablename+".objects.filter(user_id = request.user.id, id=obj.id  ).exists():",
					"            return True",
					"###############以下是views.py的代码",
					"#encoding:utf-8",
					"from django.http import HttpResponse, Http404, HttpResponseRedirect",
					"from django.views.decorators.csrf import csrf_exempt, csrf_protect",
					"from models import *",
					"from utils.utils import mp_render",
					"",
		    		"def index(request):	",
		    		"    return mp_render(request,'"+$scope.appname+"/index.html')"]
		
		
		$scope.txtviews=views.join('\n');
		//serializers
		var serializers=["",
		                 "# -*- coding: utf-8 -*-",
		                 "from rest_framework import serializers",
		                 "from models import "+$scope.tablename,
		                 "",
		                 "class "+$scope.tablename+"Serializer(serializers.ModelSerializer): #HyperlinkedModelSerializer",
						 "    # 需要展现外键时使用类似语法：user = UserNameSerializer(many=False) ",
		                 "    class Meta:",
		                 "        model = "+$scope.tablename]
		var codeline="        fields = ( 'id"
	
		for( var i=0;i<$scope.fields.length;i++ ){		 
			var f=$scope.fields[i];
			
			codeline+="','"+f.name
			
		}
		codeline+="')"
		serializers.push(codeline);
		
		$scope.txtserializers=serializers.join('\n');
		//index
		var index=["{#   ********  页头部********     #}",
				   "{% extends '"+$scope.appname+"/part/base.html' %}",
				   "{% load staticfiles %}",
				   "{% block content %}",
				   "{% load staticfiles %}",
				   "{% endblock %}",
				   "======================================",
		           "{%with title=\""+$scope.appname+"_"+$scope.tablename+"\"  %}",
		           "{% include 'assets/header.html' %}",
		           "{%endwith%}",
		           "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />",
		           "<div class=\"container\" ng-app=\"modelApp\"  >",
		           "	<div class=\"content\"  ng-controller=\"modelListCtrl\">",
		           "		<table class=\"table\">",
		           "			<thead>",
		           "				<tr>",
		           "					<th>",
		           "					    Search: <input ng-model=\"query\" placeholder=\"过滤条件\">",
		           "				        Sort by:<select ng-model=\"orderProp\">\n{options}</select>",
		           "					</th>",
		           "					<th>",
		           "						{add_model}",
		           "						<button id=\"btn-create\" type=\"button\" class=\"btn btn-primary\"  ng-click=\"add()\">添加</button>",
		           "					</th>",
		           "				</tr>",
		           "			</thead>",
		           "			<tbody>",
		           "				<tr ng-repeat=\"modelEntry in modelEntrys | filter:query | orderBy:orderProp\" >",
		           "					<td>",
		           "						<a target=\"_blank\" href=\"\" >{modellist}</a>",
		           "					</td>",
		           "					<td>",
		           "						<a href=\"#\"  ng-click=\"open( modelEntry )\" data-toggle=\"modal\" data-target=\"#myModal\">编辑</a>",
		           "						<a href=\"#\" ng-click=\"del( modelEntry)\">删除</a>",
		           "					</td>",
		           "				</tr>",
		           "			</tbody>",
		           "		</table>",
		           "		<!-- Modal -->",
		           "<div class=\"modal fade\" id=\"myModal\" tabindex=\"-1\" role=\"dialog\" aria-labelledby=\"myModalLabel\" aria-hidden=\"true\">",
		           "  <div class=\"modal-dialog\">",
		           "    <div class=\"modal-content\">",
		           "      <div class=\"modal-header\">",
		           "        <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-hidden=\"true\">&times;</button>",
		           "        <h4 class=\"modal-title\" id=\"myModalLabel\">Modal title</h4>",
		           "      </div>",
		           "      <div class=\"modal-body\">",
		           "        	{model_body}",
		           "      </div>",
		           "      <div class=\"modal-footer\">",
		           "        <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>",
		           "        <button type=\"button\" class=\"btn btn-primary\" ng-click=\"mdf( item )\">Save changes</button>",
		           "      </div>",
		           "    </div><!-- /.modal-content -->",
		           "  </div><!-- /.modal-dialog -->",
		           "</div><!-- /.modal -->",
		           " <div id=\"status\">Current filter: [[query]]  [[modelEntrys | json]]</div>",
		           "	</div>",
		           "</div>",
				   "<script src=\"{% static '"+$scope.appname+"/js/services.js'%}\"></script>",
		           "<script src=\"{% static '"+$scope.appname+"/js/"+$scope.tablename.toLowerCase()+".html.js'%}\"></script>",
		           "{% include 'assets/footer.html' %}"]
		var options="",add_model="",modellist="[[modelEntry.id]] &nbsp; ",model_body=""
			for( var i=0;i<$scope.fields.length;i++ ){		 
				var f=$scope.fields[i];
				
				options+="<option value=\""+f.name+"\">"+f.name+"</option>\n				        "
				add_model+="<input  type=\"text\"  placeholder=\""+f.common+"\"  ng-model=\""+f.name+"\"/>\n						"
				modellist+="[[modelEntry."+f.name+"]]  &nbsp;"
				model_body+=f.common+":<input  type=\"text\"  placeholder=\""+f.common+"\"  ng-model=\""+f.name+"2\"/>\n        	"
			}
			
			index=index.join('\n');
			index=index.replace(new RegExp("\\{options\\}", "g"), options);
			index=index.replace(new RegExp("\\{add_model\\}", "g"), add_model);
			index=index.replace(new RegExp("\\{modellist\\}", "g"), modellist);
			index=index.replace(new RegExp("\\{model_body\\}", "g"), model_body);
		
		$scope.txtindex=index;
		
		//service和jscontrol分类的js写法
		var txthtmljs=["'use strict';",
		                 "",
		                 "/* App Module */",
		                 "var modelApp = angular.module('modelApp', []);",
		                 "",
		                 "modelApp.config(function($interpolateProvider) {",
		                 "	$interpolateProvider.startSymbol('[[');",
		                 "	$interpolateProvider.endSymbol(']]');",
		                 "});",
		                 "",
		                 "function modelListCtrl ($scope, $http) {",
		                 "",
						"	function query(){",
						"		"+$scope.tablename.toLowerCase()+"Services.query(null,function(data) {",
						"			$scope.modelEntrys = data.results;",
						"		});		",
						"	}",
		                 "",
		                 "	$scope.add = function( ) {",
		                 "",
		                 "		var data = {",
		                 "{data_add}",
		                 "		};",
		                 "",
		                 "		"+$scope.tablename.toLowerCase()+"Services.add(data, success);",
		                 "		function success(data, status) {",
		                 "			$scope.modelEntrys.push(data);",
		                 "{data_add_success}",
		                 "		};",
		                 "	}",
		                 "",
		                 "",
		                 "	$scope.del = function(item) {",
		                 "		var id=item.id;",
		                 "		"+$scope.tablename.toLowerCase()+"Services.del(id, function(data, status) {",
		                 "			$scope.modelEntrys.splice($.inArray(item,$scope.modelEntrys),1);",
		                 "		});	",
		                 "	}",
		                 "",
		                 "",
		                 "",
		                 "	$scope.open = function(item) {",
		                 "{data_open}",
		                 "		$scope.item=item;",
		                 "	};",
		                 "",
		                 "",
		                 "	$scope.mdf = function(item) {",
		                 "		var id=item.id;",
		                 "		var data = {",
		                 "{data_mdf}",
		                 "		};",
		                 "		"+$scope.tablename.toLowerCase()+"Services.mdf(id, data,success);",
						 "		function success(data, status) {",
		                 "			$scope.modelEntrys.splice($.inArray(item,$scope.modelEntrys),1);",
		                 "			$scope.modelEntrys.push(data);",
		                 "			$('#myModal').modal('hide')",
		                 "		};",
		                 "	}",
		                 "",
		                 "	var "+$scope.tablename.toLowerCase()+"Services;",
		                 "	function init() {",
						 "		"+$scope.tablename.toLowerCase()+"Services=new "+$scope.tablename+"Services($http);",
		                 "		$scope.orderProp = '"+firstName+"';",
		                 "		query();",
		                 "	}",
		                 "",
		                 "",
		                 "	init();",
		                 "}  "]
		
		var data_add="",data_add_success="",data_open="",data_mdf="";
		for( var i=0;i<$scope.fields.length;i++ ){		 
			var f=$scope.fields[i];
			data_add+="			"+f.name+" : $.trim($scope."+f.name+")"
			data_add_success+="			$scope."+f.name+" = \"\";\n"
			data_open+="		$scope."+f.name+"2 =item."+f.name+";\n"
			data_mdf+="			"+f.name+" : $.trim($scope."+f.name+"2)"
			//处理，号
			if(i<$scope.fields.length-1){
				data_add+=",\n"
				data_mdf+=",\n"
			}
		}
		
		txthtmljs=txthtmljs.join('\n');
		txthtmljs=txthtmljs.replace(new RegExp("\\{data_add\\}", "g"), data_add);
		txthtmljs=txthtmljs.replace(new RegExp("\\{data_add_success\\}", "g"), data_add_success);
		txthtmljs=txthtmljs.replace(new RegExp("\\{data_open\\}", "g"), data_open);
		txthtmljs=txthtmljs.replace(new RegExp("\\{data_mdf\\}", "g"), data_mdf);
		
		$scope.txthtmljs=txthtmljs;
		
		//controllers		
		var controllers=["'use strict';",
		                 "",
		                 "/* App Module */",
		                 "var modelApp = angular.module('modelApp', []);",
		                 "",
		                 "modelApp.config(function($interpolateProvider) {",
		                 "	$interpolateProvider.startSymbol('[[');",
		                 "	$interpolateProvider.endSymbol(']]');",
		                 "});",
		                 "",
		                 "function modelListCtrl ($scope, $http) {",
		                 "",
		                 "	function query(){",
		                 "		$http.get('"+modelUrl+"?format=json').success(function(data) {",
		                 "		$scope.modelEntrys = data.results;",
		                 "		});",
		                 "	}",
		                 "",
		                 "	$scope.add = function( ) {",
		                 "",
		                 "		var data = {",
		                 "{data_add}",
		                 "		};",
		                 "",
		                 "		var p = $http({",
		                 "			method : 'POST',",
		                 "			url : '"+modelUrl+"',",
		                 "			data : data,",
		                 "			headers : {",
		                 "				contentType : \"application/json;charset=UTF-8\"",
		                 "			}",
		                 "		});",
		                 "		p.success(function(data, status) {",
		                 "			$scope.modelEntrys.push(data);",
		                 "{data_add_success}",
		                 "		});",
		                 "		p.error(function(data, status) {",
		                 "			alert(status);",
		                 "		});",
		                 "	}",
		                 "",
		                 "",
		                 "	$scope.del = function(item) {",
		                 "		var id=item.id;",
		                 "		$http({",
		                 "			method : 'delete',",
		                 "			url : '"+modelUrl+"'+id+'/'",
		                 "		}).success(function(data, status) {",
		                 "			$scope.modelEntrys.splice($.inArray(item,$scope.modelEntrys),1);",
		                 "		}).error(function(data, status) {",
		                 "			alert(status);",
		                 "		});",
		                 "	}",
		                 "",
		                 "",
		                 "",
		                 "	$scope.open = function(item) {",
		                 "{data_open}",
		                 "		$scope.item=item;",
		                 "	};",
		                 "",
		                 "",
		                 "	$scope.mdf = function(item) {",
		                 "		var id=item.id;",
		                 "		var data = {",
		                 "{data_mdf}",
		                 "		};",
		                 "		$http({",
		                 "			method : 'patch',",
		                 "			url : '"+modelUrl+"'+id+'/',",
		                 "			data : data,",
		                 "			headers : {",
		                 "				contentType : \"application/json;charset=UTF-8\"",
		                 "			}",
		                 "		}).success(function(data, status) {",
		                 "			$scope.modelEntrys.splice($.inArray(item,$scope.modelEntrys),1);",
		                 "			$scope.modelEntrys.push(data);",
		                 "			$('#myModal').modal('hide')",
		                 "		}).error(function(data, status) {",
		                 "			alert(status);",
		                 "		});",
		                 "	}",
		                 "",
		                 "",
		                 "	function init() {",
		                 "		$scope.orderProp = '"+firstName+"';",
		                 "		query();",
		                 "	}",
		                 "",
		                 "",
		                 "	init();",
		                 "}  "]
		
		var data_add="",data_add_success="",data_open="",data_mdf="";
		for( var i=0;i<$scope.fields.length;i++ ){		 
			var f=$scope.fields[i];
			data_add+="			"+f.name+" : $.trim($scope."+f.name+")"
			data_add_success+="			$scope."+f.name+" = \"\";\n"
			data_open+="		$scope."+f.name+"2 =item."+f.name+";\n"
			data_mdf+="			"+f.name+" : $.trim($scope."+f.name+"2)"
			//处理，号
			if(i<$scope.fields.length-1){
				data_add+=",\n"
				data_mdf+=",\n"
			}
		}
		
		controllers=controllers.join('\n');
		controllers=controllers.replace(new RegExp("\\{data_add\\}", "g"), data_add);
		controllers=controllers.replace(new RegExp("\\{data_add_success\\}", "g"), data_add_success);
		controllers=controllers.replace(new RegExp("\\{data_open\\}", "g"), data_open);
		controllers=controllers.replace(new RegExp("\\{data_mdf\\}", "g"), data_mdf);
		
		$scope.txtcontrollers=controllers;

		//urls
		var urls=["",
		          "# -*- coding: utf-8 -*-",
		          "from django.conf.urls import patterns, url,include ",
		          "from views import *",
		          "from rest_framework import routers",
		          "",
		          "",
		          "",
		          "router = routers.DefaultRouter()",
		          "router.register(r'"+$scope.tablename.toLowerCase()+"', "+$scope.tablename+"ViewSet)",
		          "urlpatterns = patterns('"+$scope.appname+".views',",
		          "    url(r'^"+$scope.tablename.toLowerCase()+"/$',TemplateView.as_view(template_name='"+$scope.appname.toLowerCase()+"/"+$scope.tablename.toLowerCase()+".html'),name='"+$scope.tablename.toLowerCase()+"'),",
				  "    url(r'^api/',include(router.urls)),",
				  "    url(r'^api/"+$scope.tablename.toLowerCase()+"list/(?P<id1>[0-9]+)/$',"+$scope.tablename+"List.as_view()),",
		          "    #url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),",
		          "    url(r'^"+$scope.tablename.toLowerCase()+"/$','index',name='index'),",
		          ")"]
		
		
		$scope.txturls=urls.join('\n');
		//
		
// services
//v ar modelUrl=("/"+$scope.appname+"/api/"+$scope.tablename+"/").toLowerCase(); 上面已经定义
var listUrl=("/"+$scope.appname+"/api/"+$scope.tablename+"list/?format=json").toLowerCase();		
		var txtservices=["",
"function "+$scope.tablename+"Services($http /*普通的ajax方式时请不要传此参数 */) {",
"	this.query = function ( jsonData,successCallback, errCallback) {",
"		if($http!=undefined){",
"			var p = $http({",
"				method : 'get',",
"				url : '"+listUrl+"',",
"				params : jsonData,",
"				headers : {",
"					contentType : 'application/json;charset=UTF-8'",
"				}",
"			});",
"			p.success(function(data, status) {",
"				if(typeof successCallback === 'function')",
"					successCallback(data, status);",
"			});",
"			p.error(function(data, status) {",
"	 			if(typeof errCallback === 'function')",
"					errCallback(data, status);",
"			});	",
"		}",
"		else{",
"			 $.ajax({",
"				 	method : 'get',",
"					url : '"+listUrl+"',",
"					data: jsonData,",    
"		            success: function(data, status){",
"						if(typeof successCallback === 'function')",
"			            	successCallback(data, status);",
"		            },",
"		            error:function(data, status){",
"						if(typeof errCallback === 'function')",
"			            	errCallback(data, status);",
"		            }",
"		        });",
"		}",
"	}",
"",
"	this.get = function (id, successCallback, errCallback) {",
"		if($http!=undefined){",
"			$http.get( '"+modelUrl+"'+id+'/?format=json').success(function(data,status) {",
"				successCallback(data, status);",
"			});",
"		}",
"		else{",
"			 $.ajax({",
"				 	method : 'get',",
"					url : '"+modelUrl+"' +id+'/?format=json',",
"		            success: function(data, status){",
"						if(typeof successCallback === 'function')",
"		            		successCallback(data, status);",
"		            },",
"		            error:function(data, status){",
"						if(typeof errCallback === 'function')",
"		            		errCallback(data, status);",
"		            }",
"		        });",
"		}",
"	}",
"	",
"	this.del=function(id,successCallback, errCallback) {",
"		if($http!=undefined){",
"			$http({",
"				method : 'delete',",
"				url : '"+modelUrl+"' +id+'/'",
"			}).success(function(data, status) {",
"				if(typeof successCallback === 'function')",
"					successCallback(data, status);",
"			}).error(function(data, status) {",
"				if(typeof errCallback === 'function')",
"					errCallback(data, status);",
"			});",
"				",
"		}else{",
"			$.ajax({",
"		          url: '"+modelUrl+"'+id+'/',",
"		          type: 'delete',",
"		          success: function(data, status){		            	",
"					if(typeof successCallback === 'function')",
"						successCallback(data, status);",
"					},",
"					error:function(data, status){		            	",
"						if(typeof errCallback === 'function')",
"							errCallback(data, status);",
"					}",
"			});	",
"		}",
"	}",
"	",
"	this.add=function (jsonData,successCallback, errCallback ){",
"		if($http!=undefined){",
"			var p = $http({",
"				method : 'POST',",
"				url : '"+modelUrl+"',",
"				data : jsonData,",
"				headers : {",
"					contentType : 'application/json;charset=UTF-8'",
"				}",
"			});",
"			p.success(function(data, status) {",
"				if(typeof successCallback === 'function')",
"					successCallback(data, status);",
"			});",
"			p.error(function(data, status) {",
"				if(typeof errCallback === 'function')",
"					errCallback(data, status);",
"			});",
"				",
"		}else{",
"			$.ajax({",
"		          url: '"+modelUrl+"',",
"		          type: 'POST', /*method ==type*/",
"		          data: jsonData,",
"				success: function(data, status){		            	",
"					if(typeof successCallback === 'function')",
"						successCallback(data, status);",
"				},",
"				error:function(data, status){		            	",
"					if(typeof errCallback === 'function')",
"						errCallback(data, status);",
"				}",
"			});",
"		}",
"	}",
"	",
"	this.mdf=function (id,jsonData,successCallback, errCallback ){",
"		if($http!=undefined){",
"			var p = $http({",
"				method : 'patch',",
"				url : '"+modelUrl+"'+id+'/',",
"				data : jsonData,",
"				headers : {",
"					contentType : 'application/json;charset=UTF-8'",
"				}",
"			});",
"			p.success(function(data, status) {",
"				if(typeof successCallback === 'function')",
"					successCallback(data, status);",
"			});",
"			p.error(function(data, status) {",
"				if(typeof errCallback === 'function')",
"					errCallback(data, status);",
"			});	",
"		}else{",
"			$.ajax({",
"				method : 'patch',",
"				url : '"+modelUrl+"'+id+'/',",
"				headers : {",
"					contentType :'application/json;charset=UTF-8'",
"				},",
"		        data: jsonData,",
"				success: function(data, status){",
"					if(typeof successCallback === 'function')",
"						successCallback(data, status);",
"				},",
"				error:function(data, status){",
"					if(typeof errCallback === 'function')",
"						errCallback(data, status);",
"				}",
"			});",
"		}",
"	}",
"}"]
$scope.txtservices=txtservices.join('\n');
	}
	
	init();
	 
	//类型选择
	$scope.seltype=function(){
		$scope.my.max_length="";
		$scope.my.true_false = "";
		$scope.my.dig_max="";
		$scope.my.dig_dec="";
		var type=$scope.my.type;
		$("#max_length").hide();
		$("#true").hide();
		$("#digits").hide();
		$("#ftablename").hide();
		
		if(type=="CharField"){
			$("#max_length").show();
		}else if(type=="DecimalField"){
			$("#digits").show();
		}else if(type=="BooleanField"){
			$("#true").show();
			$scope.my.true_false = 'True';
		}else  if(  type=='ForeignKey' ||  type=='ManyToManyField' ||  type=='OneToOneField' ){
			$("#ftablename").show();
		}
	}
}  




function doSave(value, type, name) {
    var blob;
    if (typeof window.Blob == "function") {
        blob = new Blob([value], {type: type});
    } else {
        var BlobBuilder = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder;
        var bb = new BlobBuilder();
        bb.append(value);
        blob = bb.getBlob(type);
    }
    var URL = window.URL || window.webkitURL;
    var bloburl = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    if ('download' in anchor) {
        anchor.style.visibility = "hidden";
        anchor.href = bloburl;
        anchor.download = name;
        document.body.appendChild(anchor);
        //var evt = document.createEvent("Event");
        //var evt = document.createEvent("UIEvents");
        var evt = document.createEvent("MouseEvents");
        evt.initEvent("click", true, true);
        //evt.initUIEvent("click", true, true, document.defaultView, 0);
        //evt.initMouseEvent("click", true, true, document.defaultView, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        anchor.dispatchEvent(evt);
        document.body.removeChild(anchor);
        /*
        var a = document.createElement('a');
        a.href = bloburl;
        a.download = name;
        a.textContent = 'Download';
        document.body.appendChild(a);
        */
    } else if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, name);
    } else {
        location.href = bloburl;
    }
}
